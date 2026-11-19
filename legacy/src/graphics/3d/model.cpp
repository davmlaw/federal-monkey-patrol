// (C) David Lawrence released under the GPL (see license.txt)
// Started:              2004
// Last modified: 09 Sep 2004

#include "graphics/3d/model.h"
#include "graphics/3d/drawablecontainers.h"
#include "model_md2.h"
#include "model_obj.h"
#include "util/util.h"
#include <algorithm>
#include <iostream>
#include <map>

using namespace std;

typedef struct {
	GLuint list;
	Drawable* model;
} model_details_t;

typedef std::map<std::string, model_details_t> ModelTable;

static const string DIR = "data/models/";
static ModelTable loaded_models;

const unsigned int SimpleModel::VERTEX_DIMENSIONS = 3;
const unsigned int SimpleModel::NORMAL_DIMENSIONS = 3;
const unsigned int SimpleModel::TEXCOORD_DIMENSIONS = 2; 


Drawable* Model::Factory(const string& filename, const string& texname)
{
	//cout << "Loading Model: \"" << filename << "\"\n";
	model_details_t* md;
	bool model_is_static = false;

	ModelTable::iterator p = loaded_models.find( filename );
	if( p != loaded_models.end() ) {
		md = &p->second;
	} else { // Model not found, so load it.
		Model* mdl = 0;

		try {
			if( filename.find(".obj") != string::npos ) {
				mdl = new Model_OBJ();
				model_is_static = true;
			} else if( filename.find(".md2") != string::npos ) {
				mdl = new Model_MD2();
			} else
				throw string("Unrecognised Model Type: ") + filename;

			mdl->load( DIR + filename );
			mdl->setTexture( Texture_Factory( DIR + texname ) );
		} catch(string& e) {
			string err_msg = "Exception in Model.Factory(";
			err_msg += filename + ", " + texname + "):\n" + e + "\n";
			ERR_QUIT(err_msg, 1);
		}

		model_details_t newmd;
		newmd.list = 0; // not an OpenGL list.
		newmd.model = mdl;

		md = &loaded_models[filename];
		*md = newmd;
	}

	if( model_is_static ) {
		if( md->list == 0 ) {
			md->list = md->model->getDisplayList();
		}
		return new DrawableStaticFlyweight(md->model, md->list);
	}

	return new DrawableFlyweight(md->model);
}


Model::~Model()
{
	delete texture;
}


SimpleModel::SimpleModel(void): Model()
{
	string str = "default";

	vertex_array = 0;
	texcoord_array = 0;
	normal_array = 0;

	// Create a default group with default material
	ModelGroup default_modelgroup;
	default_modelgroup.name = str;
	groups.push_back(default_modelgroup);
	setGroup(str);

	default_material.name = str;
	default_material.ambient[0] = 0.1f;
	default_material.ambient[1] = 0.1f;
	default_material.ambient[2] = 0.1f;
	default_material.ambient[3] = 1.0f;
	default_material.diffuse[0] = 1.0f;
	default_material.diffuse[1] = 1.0f;
	default_material.diffuse[2] = 1.0f;
	default_material.diffuse[3] = 1.0f;
	default_material.emission[0] = 0.0f;
	default_material.emission[1] = 0.0f;
	default_material.emission[2] = 0.0f;
	default_material.emission[3] = 1.0f;
	default_material.specular[0] = 0.0f;
	default_material.specular[1] = 0.0f;
	default_material.specular[2] = 0.0f;
	default_material.specular[3] = 1.0f;
	default_material.shininess = 0;

	materials.push_back(default_material);
	setMaterial(str);

	max_x = max_y = max_z = 0; // For sphere collision detection
	min_x = min_y = min_z = 0;
}


SimpleModel::~SimpleModel(void)
{
	delete[] vertex_array;
	delete[] normal_array;
	delete[] texcoord_array;
}



// FIXME: No materials....
void SimpleModel::representation(drawdetails_t& drawdetails)
{
	group_list_t::iterator grp;
	face_list_t::iterator face;
	GLfloat *nml, *tc, *vtx;

	glShadeModel(GL_SMOOTH);
	glRotatef( 180.0f, 0.0f, 1.0f, 0.0f ); // flip 180

	texture->activate();

	for( grp=groups.begin() ; grp != groups.end() ; ++grp ) {
		glBegin(GL_TRIANGLES);
		for( face=grp->faces.begin(); face!=grp->faces.end(); ++face ){
			for( int i=0 ; i<3 ; ++i ) {
				nml = normalv( face->normal_idx[i] );
				glNormal3fv(nml);
				tc = texcoordv( face->texcoord_idx[i] );
				glTexCoord2fv(tc);
				vtx = vertexv( face->vertex_idx[i] );
				glVertex3fv(vtx);
			}
		}
		glEnd();
	}
	glShadeModel(GL_FLAT);
}



void SimpleModel::newGroup(const string& name)
{
	ModelGroup newmodel;
	newmodel.name = name;
	newmodel.material = materials.begin();
	groups.push_back(newmodel);
	setGroup(name);
}


////////// These are small unary functions used in std container algorithms
////////// containing ModelGroups - setGroups() and Materials - setMaterial()
class GroupNameEq : public unary_function<ModelGroup,bool> {
	string s;
public:
	explicit GroupNameEq(const string& ss): s(ss) { }
	bool operator()(const ModelGroup &g) const { return g.name==s; }
};

class MatNameEq : public unary_function<Material,bool> {
	string s;
public:
	explicit MatNameEq(const string& ss): s(ss) { }
	bool operator()(const Material &m) const { return m.name==s; }
};
//////////


void SimpleModel::setGroup(const string& name)
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

void SimpleModel::newMaterial(const string &name)
{
	Material newmat;

	//cout << "NEW MATERIAL " << name << endl;
	newmat = default_material;
	newmat.name = name;
	materials.push_back(newmat);
	setMaterial(name);
}

/////////////////
// Materials are set for current group.
void SimpleModel::setMaterial(const string &name)
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
		throw string("Couldn't find material \"" + name + "\""); 
	}

}

void SimpleModel::setMatAmbient(GLfloat r, GLfloat g, GLfloat b, GLfloat a)
{
	current_group->material->ambient[0] = r;
	current_group->material->ambient[1] = g;
	current_group->material->ambient[2] = b;
	current_group->material->ambient[3] = a;
}


void SimpleModel::setMatDiffuse(GLfloat r, GLfloat g, GLfloat b,GLfloat a)
{
	current_group->material->diffuse[0] = r;
	current_group->material->diffuse[1] = g;
	current_group->material->diffuse[2] = b;
	current_group->material->diffuse[3] = a;
}


void SimpleModel::setMatEmission(GLfloat r, GLfloat g, GLfloat b,GLfloat a)
{
	current_group->material->emission[0] = r;
	current_group->material->emission[1] = g;
	current_group->material->emission[2] = b;
	current_group->material->emission[3] = a;
}


void SimpleModel::setMatSpecular(GLfloat r, GLfloat g, GLfloat b,GLfloat a)
{
	current_group->material->specular[0] = r;
	current_group->material->specular[1] = g;
	current_group->material->specular[2] = b;
	current_group->material->specular[3] = a;
}

void SimpleModel::setMatShininess(GLfloat shininess)
{
	current_group->material->shininess = shininess;
}


void SimpleModel::addFace(Face& face)
{
	current_group->faces.push_back(face);
}


void SimpleModel::addVertex(GLfloat x, GLfloat y, GLfloat z)
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

void SimpleModel::addNormal(GLfloat x, GLfloat y, GLfloat z)
{
	normals.push_back(x);
	normals.push_back(y);
	normals.push_back(z);
}

// TEX COORD = 2D (so no Z)
void SimpleModel::addTexcoord(GLfloat x, GLfloat y)
{
	texcoords.push_back(x);
	texcoords.push_back(y);
}


// Reverse vertex winding (We want ANTICLOCKWISE) so backfaces can be culled.
void SimpleModel::reverseWinding(Face &face)
{
	GLuint tmp;

	// Vertex indicies.
	tmp = face.vertex_idx[1];
	face.vertex_idx[1] = face.vertex_idx[2];
	face.vertex_idx[2] = tmp;
	// Normals
	tmp = face.normal_idx[1];
	face.normal_idx[1] = face.normal_idx[2];
	face.normal_idx[2] = tmp;
	// Texcoords
	tmp = face.texcoord_idx[1];
	face.texcoord_idx[1] = face.texcoord_idx[2];
	face.texcoord_idx[2] = tmp;

}

// So what do we have to do to finish it?
//
// Generate smooth normals.
// Copy to datastructures for fast rendering.
// Keep groups intact. Unnecessary to remember group names, though.
// Calculate & store the model's height.
void SimpleModel::postProcess(void)
{
	// Place into render data structs
	// Drawing may be reimplemented later with vertex arrays.
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

	// Calculate & store height
	//cout << "height = " << max_y + fabs(min_y) << endl;
	setHeight( max_y + fabs(min_y) );

	// Radius for isOccluded()
	GLfloat x = max( fabsf(min_x), max_x );
	GLfloat y = max( fabsf(min_y), max_y );
	GLfloat z = max( fabsf(min_z), max_z );
	float radius = sqrt( x*x + y*y + z*z );

	// set DrawableSphere's sphere
	sphere = Sphere(radius);

	//cout << "radius = " << radius << endl;

}


// This assigns a normal vector to each vertex in the Model, based on smoothing
// the face normals around each vertex.
void SimpleModel::generateSmoothNormals(void)
{
	group_list_t::iterator grp;
	face_list_t::iterator face;

	GLfloat x, y, z;
	vector< vector<vector3> > group_face_normals( groups.size() );

	int g = 0;
	for( grp=groups.begin() ; grp != groups.end() ; ++grp, ++g ) {
		if( grp->faces.empty() )
			continue; // we don't need to resize to zero, or anything else.

		group_face_normals[g].resize( grp->faces.size() );

		int f = 0;
		for( face = grp->faces.begin() ; face != grp->faces.end() ; ++face ) {
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

	//cout << "Done with generating face normals\n";

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

	size_t num_vertices = vertices.size();

	for( size_t v = 0 ; v < num_vertices ; ++v ) {
		Sum.set(0.0, 0.0, 0.0);
		int g = 0;
		for( grp=groups.begin() ; grp != groups.end() ; ++grp ) {
			int f = 0;
			for( face=grp->faces.begin() ; face != grp->faces.end() ; ++face ){
				if( face->vertex_idx[0] == v ||
					face->vertex_idx[1] == v ||
					face->vertex_idx[2] == v ) {
						Sum += group_face_normals[g][f];
				}
				++f;
			}
			++g;
		}

		Normal = Normalized(Sum);
		addNormal(Normal.x, Normal.y, Normal.z);
	}

}

