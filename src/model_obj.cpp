/* Project: Kong
 * Description: Loads Wavefront .Obj models to our model format. 
 * Started: 13 September 2002
 * Author: David Lawrence
 *
 * A first attempt at loading models.....
 * This is not as robust as it could be.
 *
 */

#include <string>
#include <iostream>
#include <fstream>
#include <map>

#include "kong.h"
#include "model_obj.h"

// Maximum line length of .OBJ and .MTL files. 1024 = pulled out of my ass.
#define MAX_OBJ_LINE 1024

using namespace std;

void Model_OBJ::load(string &filename)
{

    set_name(filename);

    cout << "Loading OBJ: " << filename << endl;

    // Handler for data we will find in a wavefront .OBJ file.
    functab_t handler;

    handler["f"]      = &Model_OBJ::line_f;
    handler["g"]      = &Model_OBJ::line_g;
    handler["group"]  = &Model_OBJ::line_group;
    handler["mtllib"] = &Model_OBJ::line_mtllib;
    handler["usemtl"] = &Model_OBJ::line_usemtl;
    handler["v"]      = &Model_OBJ::line_v;
    handler["vt"]     = &Model_OBJ::line_vt;
    // Note: We do not read normals "vn f f f" as we calculate them ourselves.

    text_reader(filename, handler);

}


// (f)ace information.
// Data: (int) indicies for polygons delimited by "/"
// These can be for vertices AND OPTIONALLY texcoords and normals.
// Poly's with sides > 3 are triangulated.

// Again, we don't care about normals.
#define VERTEX 1
#define TEXCOORD 2
#define NORMAL 4

bool Model_OBJ::line_f(char *data)
{
    char buf[80] = { 0 };
    int matched, mask;
    int v, t, n;
    int vtx;
    Face new_face;

    // Used to hold points for triangulation
    int v_pt[2];
    int t_pt[2];

    //cout << "Line_f(\"" << data << "\"\n";

    for( vtx = 0 ; 1 ; vtx++ ) {

	if( sscanf(data, "%s", buf) == 1 ) {
	    data += strlen(buf);
	    if( *data == ' ' )
		data++; // move past spaces.
	} else
	    break;

	//printf("buf = \"%s\"\n", buf);

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
	    cout << "Error reading face data from \"" << data << "\"\n";
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

	    add_face(new_face);

	    // sides > 3, so we have to triangulate
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
	add_face( new_face );
	return true;
    } else {
	cout << "Error, only " << vtx << " faces read in \"" << data << "\"\n";
	return false;
    }

}


// (g)roup
// Create a group. Subsequent faces in the .OBJ belong to this group.
// Data: (string) group_name

bool Model_OBJ::line_g(char *data)
{
    //cout << "Line_g(\"" << data << "\"\n";

    string group_name(data);
    new_group(group_name);
    return true;
}

// change current group state.
// Data: (string) group_name

bool Model_OBJ::line_group(char *data)
{
    //cout << "Line_group(\"" << data << "\"\n";
    string group_name(data);
    try { set_group(group_name); }
    catch( std::string &str) {
	cout << str << endl;
    }
    return true;
}


// Set Material Library.
// This is a file with extension ".mtl" in the same directory as the .OBJ

bool Model_OBJ::line_mtllib(char *data)
{
    //cout << "Line_mtllib(\"" << data << "\"\n";
    // FIXME: File loading library....
    string filename(data);
    filename = "data/" + filename;
    return read_mtllib(filename);
}

// Set Material for current group. 
bool Model_OBJ::line_usemtl(char *data)
{
    //cout << "Line_usemtl(\"" << data << "\"\n";
    string mat(data);
    try { set_material(mat); }
    catch( std::string &str) {
	// This isn't such a big deal.
	//cout << str << endl;
    }
    return true;
}


// Vertex
bool Model_OBJ::line_v(char *data)
{
    GLfloat x, y, z;
    int matched;

    //cout << "Line_v(\"" << data << "\"\n";
    matched = sscanf(data, "%f %f %f", &x, &y, &z);
    add_vertex(x, y, z);

    return (matched==3);

}


// TexCoord
bool Model_OBJ::line_vt(char *data)
{
    GLfloat x, y;
    int matched;

    //cout << "Line_vt(\"" << data << "\"\n";
    matched = sscanf(data, "%f %f", &x, &y);
    add_texcoord(x, y);

    return (matched==2);

}

///////////// MTLLIB //////////
//   Wavefront .mtl file format:

//   newmtl (float) MATERIAL_NAME
//   Ns (float) SHININESS
//   K[ades] (float) RED (float) GREEN (float) BLUE (float) ALPHA

//   a,d,e,s = Ambient, Diffuse, Emission, Specular 

bool Model_OBJ::read_mtllib(string &filename)
{
    //cout << "read_mtllib(\"" << filename << "\"\n";

    functab_t handler;

    handler["newmtl"]     = &Model_OBJ::mtl_line_newmtl;
    handler["Ns"]         = &Model_OBJ::mtl_line_Ns;
    handler["Ka"]         = &Model_OBJ::mtl_line_Ka;
    handler["Kd"]         = &Model_OBJ::mtl_line_Kd;
    handler["Ke"]         = &Model_OBJ::mtl_line_Ke;
    handler["Ks"]         = &Model_OBJ::mtl_line_Ks;

    text_reader(filename, handler);

    return true;

}


bool Model_OBJ::mtl_line_newmtl(char *data)
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
bool Model_OBJ::mtl_line_Ns(char *data)
{
    //cout << "MTL_line_Ns(\"" << data << "\"\n";
    float shininess;

    sscanf(data, "%f", &shininess);
    // Convert from .OBJ shininess -> OpenGL shininess.
    shininess *= 1000.0 / 128.0;
    set_mat_shininess( shininess );
    return true;
}


bool Model_OBJ::mtl_line_Ka(char *data)
{
    //cout << "MTL_line_Ka(\"" << data << "\"\n";
    float r, g, b, a;

    a = 1.0;
    sscanf(data, "%f %f %f %f", &r, &g, &b, &a );
    set_mat_ambient(r, g, b, a);
    return true;
}

bool Model_OBJ::mtl_line_Kd(char *data)
{
    //cout << "MTL_line_Kd(\"" << data << "\"\n";
    float r, g, b, a;

    a = 1.0;
    sscanf(data, "%f %f %f %f", &r, &g, &b, &a );
    set_mat_diffuse(r, g, b, a);
    return true;
}

bool Model_OBJ::mtl_line_Ke(char *data)
{
    //cout << "MTL_line_Ke(\"" << data << "\"\n";
    float r, g, b, a;

    a = 1.0;
    sscanf(data, "%f %f %f %f", &r, &g, &b, &a );
    set_mat_emission(r, g, b, a);
    return true;
}

bool Model_OBJ::mtl_line_Ks(char *data)
{
    //cout << "MTL_line_Ks(\"" << data << "\"\n";
    float r, g, b, a;

    a = 1.0;
    sscanf(data, "%f %f %f %f", &r, &g, &b, &a );
    set_mat_specular(r, g, b, a);
    return true;
}



// FIXME: We could make a more generic text_reader than just Model_OBJ

void Model_OBJ::text_reader(string &filename, functab_t &handler)
{

    std::ifstream from(filename.c_str());
    if( !from ) {
	cout << "Can't open " << filename << endl;
	return;
    }

    char line[MAX_OBJ_LINE];
    string word;
    functab_t::iterator it;

    while( !from.eof() ) {
	from >> word;
	if( !from.getline(line, MAX_OBJ_LINE) )
	    continue;
	if( word[0] == '#' )
	    continue;
	chomp(line); // remove '\r'

	if( !(line[0] && line[1]) ) {
	    std::cout << "text_reader: Line \"" << line << "\" too short\n";
 	    continue;
	}

	//handler[word](line);
	it = handler.find(word);
	if( it != handler.end() )
	    (this->*it->second)(line+1);
    }

}
