// (C) David Lawrence released under the GPL (see license.txt)
// Description:   Loads Wavefront .Obj models to our model format. 
// Started:       13 Sep 2002
// Last modified: 01 Sep 2004

#include "graphics/3d/model_obj.h"
#include "graphics/timer.h"
#include <iostream>

using namespace std;

void Model_OBJ::load(const string filename)
{
    Timer t;

    setName(filename);
    OBJ_Reader obj(filename, this);
    
    //cout << "File processing = " << t.tick() << " msecs\n";

    // Get simple model optimised for rendering.
    generateSmoothNormals();
    //cout << "Smooth normals = " << t.tick() << " msecs\n";
    postProcess();
    //cout << "post process = " << t.tick() << " msecs\n";
}


////////////////////

OBJ_Reader::OBJ_Reader(const string f, Model_OBJ* obj):
    TextFileReader(f), mdl(obj)
{
    functab["f"]      = &OBJ_Reader::line_f;
    functab["g"]      = &OBJ_Reader::line_g;
    functab["group"]  = &OBJ_Reader::line_group;
    functab["mtllib"] = &OBJ_Reader::line_mtllib;
    functab["usemtl"] = &OBJ_Reader::line_usemtl;
    functab["v"]      = &OBJ_Reader::line_v;
    functab["vt"]     = &OBJ_Reader::line_vt;
    // We do not read normals "vn f f f" as we calculate them ourselves.

    process();
}


void OBJ_Reader::handle_line(string& line)
{
    string word, rest;
    extract_first_rest( line, word, rest );

    // "functab[word](line)" is cooler, but less safe
    functab_t::iterator it = functab.find(word);
    if( it != functab.end() )
	(this->*it->second)( rest.c_str() );
    else {
	string msg = "ERROR: No Handler set for token \"" + word + "\"";
	throw msg;
    }
}

	
// (f)ace information.
// Data: (int) indicies for polygons delimited by "/"
// These can be for vertices AND OPTIONALLY texcoords and normals.
// Poly's with sides > 3 are triangulated.

// OBJ faces are in CLOCKWISE order, we need to reverse their winding
// to ANTICLOCKWISE as that's how the rest of the game wants them.

// Again, we don't care about normals.

bool OBJ_Reader::line_f(const string& line)
{
    char buf[80] = { 0 };
    int matched, mask;
    int v, t, n;
    int vtx;
    Face new_face;

    // Used to hold points for triangulation
    int v_pt[2];
    int t_pt[2];

    const char* data = line.c_str();
    
    for( vtx = 0 ; 1 ; vtx++ ) {
	if( sscanf(data, "%s", buf) == 1 ) {
	    data += strlen(buf);
	    if( *data == ' ' )
		data++; // move past spaces.
	} else
	    break;
	
	const unsigned int VERTEX   = 1<<0;
	const unsigned int TEXCOORD = 1<<1;
	const unsigned int NORMAL   = 1<<2;

	mask = 0;
	if( (matched = sscanf(buf, "%d/%d/%d", &v, &t, &n)) == 3 )
	    mask = VERTEX | TEXCOORD | NORMAL;
	else if( (matched = sscanf(buf, "%d//%d", &v, &n)) == 2 )
	    mask = VERTEX | NORMAL;
	else if( (matched = sscanf(buf, "%d/%d", &v, &t)) == 2 )
	    mask = VERTEX | TEXCOORD;
	else if( (matched = sscanf(buf, "%d", &v)) == 1 )
	    mask = VERTEX;
	else {
	    cout << "Error reading face data from \""
		 << data << "\"\n";
	    break;
	}

	v--, t--; // Convert to a 0-indexed array.

	if( vtx < 3 ) {
	    // The first vertex in a polygon is used as the first
	    // vertex in all triangulated polygons. Store it for later.
	    if( vtx == 0 ) {
		v_pt[0] = v;
		t_pt[0] = t;
	    }

	    new_face.vertex_idx[vtx] = v;
	    new_face.texcoord_idx[vtx] = t;
	    
	} else {
	    // We triangulate by making a new triangle for each
	    // side > 3 using (1st vertex, prev vtx, this vtx)
	    
	    mdl->reverseWinding(new_face);
	    mdl->addFace(new_face);
	    
	    if( mask & VERTEX ) {
		new_face.vertex_idx[0] = v_pt[0];
		new_face.vertex_idx[1] = v_pt[1];
		new_face.vertex_idx[2] = v;
	    }
	    
	    if( mask & TEXCOORD ) {
		new_face.texcoord_idx[0] = t_pt[0];
		new_face.texcoord_idx[1] = t_pt[1];
		new_face.texcoord_idx[2] = t;
	    }
	}

	// Keep last index for this face to triangulate the next face
	v_pt[1] = v;
	t_pt[1] = t;
    }
    
    if( vtx >= 3 ) {
	mdl->reverseWinding(new_face);
	mdl->addFace( new_face );
	return true;
    } else {
	cout << "Error, only " << vtx
	     << " faces read in \"" << data << "\"\n";
	return false;
    }

}


// (g)roup
// Create a group. Subsequent faces in the .OBJ belong to this group.
// Data: (string) group_name

bool OBJ_Reader::line_g(const string& line)
{
    mdl->newGroup(line);
    return true;
}

// change current group state.
// Data: (string) group_name

bool OBJ_Reader::line_group(const string& line)
{
    try {
	mdl->setGroup(line);
    } catch( string &str) {
	cout << "ERROR: " << str << endl;
    }
    return true;
}


// Set Material Library.
// This is a file with extension ".mtl" in the same directory as the .OBJ

bool OBJ_Reader::line_mtllib(const string& line)
{
    // FIXME: DISABLED
    string filename = string("data/") + line;
    return true; //read_mtllib(filename);
}

// Set Material for current group. 
bool OBJ_Reader::line_usemtl(const string& line)
{
    try {
	mdl->setMaterial(line);
    } catch( string &e) {
	// This isn't such a big deal.
	cout << "ERROR: " << e << endl;
	return false;
    }
    return true;
}


// Vertex
bool OBJ_Reader::line_v(const string& line)
{
    GLfloat x, y, z;
    int matched = sscanf(line.c_str(), "%f %f %f", &x, &y, &z);
    mdl->addVertex(x, y, z);

    return (matched==3);

}


// TexCoord
bool OBJ_Reader::line_vt(const string& line)
{
    GLfloat x, y;
    int matched = sscanf(line.c_str(), "%f %f", &x, &y);
    mdl->addTexcoord(x, y);

    return (matched==2);

}





//////////// bleargh



#if 0 // Not converted to TextFileReader yet....

#if 0
 handler["newmtl"]     = &Model_OBJ::mtl_line_newmtl;
    handler["Ns"]         = &Model_OBJ::mtl_line_Ns;
    handler["Ka"]         = &Model_OBJ::mtl_line_Ka;
    handler["Kd"]         = &Model_OBJ::mtl_line_Kd;
    handler["Ke"]         = &Model_OBJ::mtl_line_Ke;
    handler["Ks"]         = &Model_OBJ::mtl_line_Ks;
#endif

///////////// MTLLIB //////////
//   Wavefront .mtl file format:

//   newmtl (float) MATERIAL_NAME
//   Ns (float) SHININESS
//   K[ades] (float) RED (float) GREEN (float) BLUE (float) ALPHA

//   a,d,e,s = Ambient, Diffuse, Emission, Specular 

bool MTL_Handler::read_mtllib(string &filename)
{
    //cout << "read_mtllib(\"" << filename << "\"\n";

    functab_t handler;

    handler["newmtl"]     = &MTL_Handler::mtl_line_newmtl;
    handler["Ns"]         = &MTL_Handler::mtl_line_Ns;
    handler["Ka"]         = &MTL_Handler::mtl_line_Ka;
    handler["Kd"]         = &MTL_Handler::mtl_line_Kd;
    handler["Ke"]         = &MTL_Handler::mtl_line_Ke;
    handler["Ks"]         = &MTL_Handler::mtl_line_Ks;

    return true;

}


bool MTL_Handler::mtl_line_newmtl(const string& line)
{
    //cout << "MTL_line_newmtl(\"" << data << "\"\n";
    string mat(data);
    new_material(mat);
    return true;
}

// from "man glMaterialf":
// (GL_SHININESS) this specifies the RGBA specular exponent of the material
// ... Only values in the  range  [0,128] are accepted.

// Shininess in the .OBJ file is in the range [0,1000]
bool MTL_Handler::mtl_line_Ns(const string& line)
{
    //cout << "MTL_line_Ns(\"" << data << "\"\n";
    float shininess;

    sscanf(data, "%f", &shininess);
    // Convert from .OBJ shininess -> OpenGL shininess.
    shininess *= 1000.0 / 128.0;
    setMatShininess( shininess );
    return true;
}


bool MTL_Handler::mtl_line_Ka(const string& line)
{
    //cout << "MTL_line_Ka(\"" << data << "\"\n";
    float r, g, b, a;

    a = 1.0;
    sscanf(data, "%f %f %f %f", &r, &g, &b, &a );
    setMatAmbient(r, g, b, a);
    return true;
}

bool MTL_Handler::mtl_line_Kd(const string& line)
{
    //cout << "MTL_line_Kd(\"" << data << "\"\n";
    float r, g, b, a;

    a = 1.0;
    sscanf(data, "%f %f %f %f", &r, &g, &b, &a );
    setMatDiffuse(r, g, b, a);
    return true;
}

bool MTL_Handler::mtl_line_Ke(const string& line)
{
    //cout << "MTL_line_Ke(\"" << data << "\"\n";
    float r, g, b, a;

    a = 1.0;
    sscanf(data, "%f %f %f %f", &r, &g, &b, &a );
    setMatEmission(r, g, b, a);
    return true;
}

bool MTL_Handler::mtl_line_Ks(const string& line)
{
    //cout << "MTL_line_Ks(\"" << data << "\"\n";
    float r, g, b, a;

    a = 1.0;
    sscanf(data, "%f %f %f %f", &r, &g, &b, &a );
    setMatSpecular(r, g, b, a);
    return true;
}

#endif
