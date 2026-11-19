// (C) David Lawrence released under the GPL (see license.txt)
// Started:            ? 2003
// Last modified: 31 Aug 2004

#ifndef MODEL_H
#define MODEL_H

#include <string>
#include "graphics/3d/boundeddrawable.h"
#include "graphics/texture.h"
#include "util/string_util.h"

/*
 * Abstract base for different model types
 */
class Model: public DrawableSphere {
public:
    static Drawable* Factory(const std::string& filename,
			     const std::string& texturename);
    virtual ~Model();
    virtual void load(const std::string filename) = 0;
    void setTexture(Texture *t) { texture = t; };
protected:
    Model(): DrawableSphere(0), texture(0) { };
    Texture *texture;
};



////////////////////////
/// Simple model...

typedef std::vector<GLfloat> vertex_list_t;
typedef std::vector<GLfloat> normal_list_t;
typedef std::vector<GLfloat> texcoord_list_t;

typedef struct {
    std::string name;
    GLfloat ambient[4];
    GLfloat diffuse[4];
    GLfloat emission[4];
    GLfloat specular[4];
    GLfloat shininess; //specular component
} Material;
typedef std::vector<Material> material_list_t;

typedef struct {
    unsigned int vertex_idx[3];
    unsigned int texcoord_idx[3];
    unsigned int normal_idx[3];
} Face;
typedef std::vector<Face> face_list_t;

typedef struct {
    std::string name;
    material_list_t::iterator material;
    face_list_t faces;
} ModelGroup;
typedef std::vector<ModelGroup> group_list_t;

/**
 * Basic textured model implementation
 * No animation.
 */
class SimpleModel : public Model {
public:
    SimpleModel(void);
    ~SimpleModel(void);
    virtual void representation(drawdetails_t& drawdetails);
    virtual Drawable* clone(void) {
		throw "FIXME: SimpleModel.clone() not implemented";
		return 0;
    };
protected:
    void setName(const std::string& name) { model_name = name; }
    void newGroup(const std::string& name);
    void setGroup(const std::string& name);
    void newMaterial(const std::string& name);
    void setMaterial(const std::string& name);
	
    void setMatAmbient(GLfloat r, GLfloat g, GLfloat b, GLfloat a);
    void setMatDiffuse(GLfloat r, GLfloat g, GLfloat b, GLfloat a);
    void setMatEmission(GLfloat r, GLfloat g, GLfloat b, GLfloat a);
    void setMatSpecular(GLfloat r, GLfloat g, GLfloat b, GLfloat a);
    void setMatShininess(GLfloat shininess);
	
    void addFace(Face& f);
    void addVertex(GLfloat x, GLfloat y, GLfloat z);
    void addNormal(GLfloat x, GLfloat y, GLfloat z);
    void addTexcoord(GLfloat x, GLfloat y);
    void reverseWinding(Face &f);

    std::string getName(void) { return model_name; }
    void generateSmoothNormals(void);
    void postProcess(void);
private:
    static const unsigned int VERTEX_DIMENSIONS;
    static const unsigned int NORMAL_DIMENSIONS;
    static const unsigned int TEXCOORD_DIMENSIONS;
    std::string model_name;
    Material default_material;

    typedef std::vector<GLuint> face_idx_t;
    typedef std::vector<face_idx_t> face_idx_list_t;
    
    face_idx_list_t faces_containing_vertex;
    vertex_list_t vertices;
    normal_list_t normals;
    texcoord_list_t texcoords;
    group_list_t groups;
    material_list_t materials;
    group_list_t::iterator current_group;
    
    GLfloat* normal_array;
    GLfloat* texcoord_array;
    GLfloat* vertex_array;

    GLfloat max_x, max_y, max_z;
    GLfloat min_x, min_y, min_z;

    inline GLfloat *vertexv(unsigned int &idx) {
	return &vertex_array[ idx * VERTEX_DIMENSIONS ];
    }
	
    inline GLfloat *normalv(unsigned int &idx) {
	return &normal_array[ idx * NORMAL_DIMENSIONS ];
    }

    inline GLfloat *texcoordv(unsigned int &idx) {
	return &texcoord_array[ idx * TEXCOORD_DIMENSIONS ];
    }

};








#endif
