#include <iostream>
#include <vector>
#include <string>
#include <functional>
#include <algorithm>

#include "kong.h"
#include "mtxlib.h"
#include "mesh.h"
#include "graphics.h"

//#define DO_FOG

using namespace std;


Mesh::Mesh(void): myDrawable()
{

    //state = EMPTY;
    texture_id = 0;
    spingroup = -1;

    string str = "default";

    // Create a default group with default material
    MeshGroup default_meshgroup;
    default_meshgroup.name = str;
    groups.push_back(default_meshgroup);
    set_group(str);

    default_material.name = str;
    default_material.ambient[0] = 0.2;
    default_material.ambient[1] = 0.2;
    default_material.ambient[2] = 0.2;
    default_material.ambient[3] = 1.0;
    default_material.diffuse[0] = 0.8;
    default_material.diffuse[1] = 0.8;
    default_material.diffuse[2] = 0.8;
    default_material.diffuse[3] = 1.0;
    default_material.emission[0] = 0.0;
    default_material.emission[1] = 0.0;
    default_material.emission[2] = 0.0;
    default_material.emission[3] = 1.0;
    default_material.specular[0] = 0.8;
    default_material.specular[1] = 0.8;
    default_material.specular[2] = 0.8;
    default_material.specular[3] = 1.0;
    default_material.shininess = 0;

    vertex_array = 0;
    texcoord_array = 0;
    normal_array = 0;

    materials.push_back(default_material);
    set_material(str);

    max_x = max_y = max_z = 0;
    min_x = min_y = min_z = 0;

    scale = 1.0;
    //cout << "Mesh()\n";

    list = 0;

}


Mesh::~Mesh(void)
{
    
    delete[] vertex_array;
    delete[] normal_array;
    delete[] texcoord_array;

    if( texture_id )
	glDeleteTextures(1, &texture_id);

}


static float rot = 0.0;

void Mesh::draw(void)
{





/*
    if( state != PROCESSED ) {
	cout << "mesh::draw() Tried to draw unprocessed mesh \n";
 	return;
    }
*/

    if( scale != 1.0 ) {
	glPushMatrix();
	glScalef( scale, scale, scale );
    }

    if( texture_id ) {
	glEnable(GL_TEXTURE_2D);
	glBindTexture(GL_TEXTURE_2D, texture_id);
    } else {
	glDisable(GL_TEXTURE_2D);
    }


    if( list )
	glCallList(list);
    else {

    group_list_t::iterator grp;
    face_list_t::iterator face;

    GLfloat *nml, *tc, *vtx; // These point to the (x,y(,z)) for each vertex

    //cout << "DRAWING\n";

    int g = 0;
    for( grp=groups.begin() ; grp != groups.end() ; grp++ ) {

	// HACK TO GET SPINNY PROPELLER
	if( g == spingroup ) {
      	    glPushMatrix();
	    rot -= 2.0; // anti-clockwise
	    glRotatef(rot, 0.0, 0.0, 1.0);
	}

	glBegin(GL_TRIANGLES);
	for( face = grp->faces.begin() ; face != grp->faces.end() ; face++ ) {
	    for( int i=0 ; i<3 ; i++ ) {
		nml = normalv( face->normal_idx[i] );
		glNormal3fv(nml);

		tc = texcoordv( face->texcoord_idx[i] );
		glTexCoord2fv(tc);

		vtx = vertexv( face->vertex_idx[i] );
#ifdef DO_FOG
		setFogCoord(vtx[1]);
#endif

		glVertex3fv(vtx);
	    }
	}
	glEnd();
	if( g == spingroup )
	    glPopMatrix(); // Prop. Hack.
	g++;
    }

    }

    if( scale != 1.0 )
	glPopMatrix();

}


// MEMORY LEAK. Store texture in some kind of file, so we can free old ones.
// SLOW AS HELL, NEED ONLY IMAGE HANDLING CLASS.
void Mesh::setTexture(const char *filename)
{

    SDL_Surface *TextureImage; 

    cout << "Attempting to load texture " << filename << endl;

    /* Load The Bitmap, Check For Errors, If Bitmap's Not Found Quit */
    if ( ( TextureImage = SDL_LoadBMP( filename ) ) )
    {

	/* Create The Texture */
	glGenTextures( 1, &texture_id );

	/* Load in texture 3 */
	/* Typical Texture Generation Using Data From The Bitmap */
	glBindTexture( GL_TEXTURE_2D, texture_id );

	/* Mipmapped Filtering */
	glTexParameteri( GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER,
			 GL_LINEAR_MIPMAP_NEAREST );
	glTexParameteri( GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER,
			 GL_LINEAR );

	/* Generate The MipMapped Texture  */
	gluBuild2DMipmaps( GL_TEXTURE_2D, GL_RGB, TextureImage->w,
			   TextureImage->h, GL_BGR,
			   GL_UNSIGNED_BYTE, TextureImage->pixels );

	cout << "Setting texture to: " << filename << endl;
	SDL_FreeSurface( TextureImage );
    } else {
	std::string str("Unable to loat texture \"");
	str += filename;
	str += "\"\n";
	throw str;
    }


}


void Mesh::new_group(string &name)
{
    MeshGroup newmesh;
    newmesh.name = name;
    newmesh.material = materials.begin();
    groups.push_back(newmesh);
    set_group(name);
}


////////// These are small unary functions used in std container algorithms
////////// containing MeshGroups - set_groups() and Materials - set_material()
class GroupNameEq : public unary_function<MeshGroup,bool> {
    string s;
public:
    explicit GroupNameEq(const string &ss): s(ss) { }
    bool operator()(const MeshGroup &g) const { return g.name==s; }
};

class MatNameEq : public unary_function<Material,bool> {
    string s;
public:
    explicit MatNameEq(const string &ss): s(ss) { }
    bool operator()(const Material &m) const { return m.name==s; }
};
//////////


void Mesh::set_group(string &name)
{
    group_list_t::iterator grp;

    //cout << "Searching for GROUP \"" << name << "\"\n";

    grp = find_if( groups.begin(), groups.end(), GroupNameEq(name) );
    if( grp !=  groups.end() ) {
	//cout << "Found group " << name << endl;
	current_group = grp;
	return;
    } else {
	throw string("Couldn't find group \"" + name + "\"\n"); 
    }

    
    
}

void Mesh::new_material(string &name)
{
    Material newmat;

    //cout << "NEW MATERIAL " << name << endl;
    newmat = default_material;
    newmat.name = name;
    materials.push_back(newmat);
    set_material(name);

}

/////////////////
// Materials are set for current group.
void Mesh::set_material(string &name)
{
    material_list_t::iterator mat;
    //cout << "Searching for MATERIAL \"" << name << "\"\n";
    //cout << "Size of materials array = " << materials.size() << endl;

    mat = find_if( materials.begin(), materials.end(), MatNameEq(name) );
    if( mat !=  materials.end() ) {
	//cout << "Found material " << name << endl;
	current_group->material = mat;
	return;
    } else {
	throw string("Couldn't find material \"" + name + "\"\n"); 
    }

}

void Mesh::set_mat_ambient(GLfloat &r, GLfloat &g, GLfloat &b, GLfloat &a)
{
    current_group->material->ambient[0] = r;
    current_group->material->ambient[1] = g;
    current_group->material->ambient[2] = b;
    current_group->material->ambient[3] = a;
}


void Mesh::set_mat_diffuse(GLfloat &r, GLfloat &g, GLfloat &b, GLfloat &a)
{
    current_group->material->diffuse[0] = r;
    current_group->material->diffuse[1] = g;
    current_group->material->diffuse[2] = b;
    current_group->material->diffuse[3] = a;
}


void Mesh::set_mat_emission(GLfloat &r, GLfloat &g, GLfloat &b, GLfloat &a)
{
    current_group->material->emission[0] = r;
    current_group->material->emission[1] = g;
    current_group->material->emission[2] = b;
    current_group->material->emission[3] = a;
}


void Mesh::set_mat_specular(GLfloat &r, GLfloat &g, GLfloat &b, GLfloat &a)
{
    current_group->material->specular[0] = r;
    current_group->material->specular[1] = g;
    current_group->material->specular[2] = b;
    current_group->material->specular[3] = a;
}

void Mesh::set_mat_shininess(GLfloat &shininess)
{
    current_group->material->shininess = shininess;
}


void Mesh::add_face(Face &face)
{

    //cout << "Adding face.\n";

    current_group->faces.push_back(face); // Add to end of face vector

    /*
    unsigned int vidx, fidx; // vertex, face index.
    fidx = current_group->faces.size()-1;

    // Register with each vertex that this face is touching it.
    for( int i=0 ; i<3 ; i++ ) {
	vidx = face.vertex_idx[i];

	unsigned int currsize = faces_containing_vertex.size();
	if( currsize <= vidx ) {
	    unsigned int newsize;
	    // resize the vector
	    if( currsize < vertices.size() )
		newsize = vertices.size();
	    else {
		cout << "Maybe a filename error face #" << currsize << endl;
		newsize = vidx * 2;
	    }

	    if( newsize < 1 )
		newsize = 1; // sanity check.
	    faces_containing_vertex.resize( newsize );
	    cout << "faces_sharing size = " << faces_containing_vertex.size() << endl;

	}
	faces_containing_vertex[vidx].push_back( fidx );
    }

    */

}


void Mesh::add_vertex(GLfloat x, GLfloat y, GLfloat z)
{
    vertices.push_back(x);
    vertices.push_back(y);
    vertices.push_back(z);

    if( x > max_x )
	max_x = x;
    else if( x < min_x )
	min_x = x;

    if( y > max_y )
	max_y = y;
    else if( y < min_y )
	min_y = y;

    if( z > max_z )
	max_z = z;
    else if( z < min_z )
	min_z = z;



}

void Mesh::add_normal(GLfloat x, GLfloat y, GLfloat z)
{
    normals.push_back(x);
    normals.push_back(y);
    normals.push_back(z);
}

// TEX COORD = 2D (so no Z)
void Mesh::add_texcoord(GLfloat x, GLfloat y)
{
    texcoords.push_back(x);
    texcoords.push_back(y);
}



// So what do we have to do to finish it?
//
// Generate smooth normals.
// Copy to datastructures for fast rendering.
// Keep groups intact. Unnecessary to remember group names, etc.
void Mesh::process(void)
{

    /*
    group_list_t::iterator grp;


    int total_faces = 0;
    cout << "Post processing the mesh.\n";

    cout << "--------------------------\n";
    cout << "MODEL STATISTICS:\n";
    cout << " -Total vertices: " << vertices.size() << endl;
    cout << " -Total texcoords: " << texcoords.size() << endl;
    cout << " -Groups:\n";

    for( grp = groups.begin() ; grp != groups.end() ; grp++ ) {
	cout << "      " << grp->name << ": " << grp->faces.size()
	     << " faces.\n";
	total_faces += grp->faces.size();
    }

    cout << "Total faces = " << total_faces << endl;
    cout << "--------------------------\n";

    */

    // Place into render data structs
    // Drawing will be reimplemented later with vertex arrays.

    vertex_array = new GLfloat[vertices.size()];
    normal_array = new GLfloat[vertices.size()]; //normals are per-vertex
    texcoord_array = new GLfloat[texcoords.size()];

    vertex_list_t::iterator vtx;
    normal_list_t::iterator nml;
    texcoord_list_t::iterator tc;

    int i = 0;
    for( vtx=vertices.begin() ; vtx != vertices.end() ; vtx++ ) {
	vertex_array[i++] = *vtx;
    }
    int num_vertices = i;

    i = 0;
    for( nml=normals.begin() ; nml != normals.end() ; nml++ ) {
	if( i >= num_vertices )
	    break;
	normal_array[i++] = *nml;

    }
    
    i = 0;
    for( tc=texcoords.begin() ; tc != texcoords.end() ; tc++ ) {
	texcoord_array[i++] = *tc;
    }

    vertices.clear();
    normals.clear();
    texcoords.clear();

    GLuint foo = glGenLists(1);

    glNewList(foo, GL_COMPILE);
    this->draw();
    glEndList();

    list = foo;

}


// This assigns a normal vector to each vertex in the mesh, based on smoothing
// the facet normals around each vertex.
void Mesh::generate_smooth_normals(void)
{
    group_list_t::iterator grp;
    face_list_t::iterator face;

    cout << "Generating normals..\n";

    GLfloat x, y, z;
    GLuint g, f, v;
    vector< vector<vector3> > group_face_normals( groups.size() );

    for( g = 0, grp=groups.begin() ; grp != groups.end() ; grp++, g++ ) {

	if( !grp->faces.size() )
	    continue; // we don't need to resize to zero, or anything else.

//	cout << "Resizing " << grp->name << " - " << grp->faces.size() << "\n";
	group_face_normals[g].resize( grp->faces.size() );

	f = 0;
	for( face = grp->faces.begin() ; face != grp->faces.end() ; face++ ) {
	    // Vectors U and V are sides of a triangle
	    // The crossproduct is the face's normal.
	    face->normal_idx[0] = face->vertex_idx[0];
	    face->normal_idx[1] = face->vertex_idx[1];
	    face->normal_idx[2] = face->vertex_idx[2];

	    x = vertices[ face->vertex_idx[0] * 3 ];
	    y = vertices[ face->vertex_idx[0] * 3 + 1 ];
	    z = vertices[ face->vertex_idx[0] * 3 + 2 ];
	    vector3 U(x, y, z);

	    x = vertices[ face->vertex_idx[1] * 3 ];
	    y = vertices[ face->vertex_idx[1] * 3 + 1 ];
	    z = vertices[ face->vertex_idx[1] * 3 + 2 ];
	    vector3 V(x, y, z);

	    group_face_normals[g][f] = CrossProduct( U, V );
	    f++;
	}
    }

    cout << "Done with generating face normals\n";

/*

for each vertex
Sum = 0
       for each group
            for each face
               if the face contains this vertex then add vector to Sum

Assign Normalize Sum


*/

    vector3 Sum;
    vector3 Normal;

    GLuint num_vertices = vertices.size();

    for( v = 0 ; v < num_vertices ; v++ ) {
	Sum.set(0.0, 0.0, 0.0);
	g = 0;
	for( grp=groups.begin() ; grp != groups.end() ; grp++ ) {
	    f = 0;

	    for( face=grp->faces.begin() ; face != grp->faces.end() ; face++ ){
		if( face->vertex_idx[0] == v ||
		    face->vertex_idx[1] == v ||
		    face->vertex_idx[2] == v ) {

		    Sum += group_face_normals[g][f];
		}
		f++;
	    }
	    g++;
	}

	Normal = Normalized(Sum);
	add_normal(Normal.x, Normal.y, Normal.z);
    }

}

