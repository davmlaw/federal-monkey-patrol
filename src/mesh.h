#ifndef MESH_H
#define MESH_H

#include <vector>
#include <string>

#include "drawable.h"

#define VERTEX_DIMENSIONS 3
#define NORMAL_DIMENSIONS 3
#define TEXCOORD_DIMENSIONS 2

// Types
typedef std::vector<GLfloat> vertex_list_t;
typedef std::vector<GLfloat> normal_list_t;
typedef std::vector<GLfloat> texcoord_list_t;


typedef struct _material {
    std::string name;
    GLfloat ambient[4];
    GLfloat diffuse[4];
    GLfloat emission[4];
    GLfloat specular[4];
    GLfloat shininess; //specular component
} Material;
typedef std::vector<Material> material_list_t;

typedef struct _Face
{
    GLuint vertex_idx[3];
    GLuint texcoord_idx[3];
    GLuint normal_idx[3];
} Face;
typedef std::vector<Face> face_list_t;

typedef struct _MeshGroup
{
    string name;
    material_list_t::iterator material;
    face_list_t faces;

} MeshGroup;
typedef std::vector<MeshGroup> group_list_t;

class Mesh : public myDrawable
{
 protected:
    GLuint list;
    std::string mesh_name;
    GLuint texture_id;
    Material default_material;

    typedef std::vector<GLuint> face_idx_t;
    typedef std::vector<face_idx_t> face_idx_list_t;
    
    face_idx_list_t faces_containing_vertex;
    //

    vertex_list_t vertices;
    normal_list_t normals;
    texcoord_list_t texcoords;
    group_list_t groups;
    material_list_t materials;

    group_list_t::iterator current_group;

    int spingroup;
    /// TEMPORARY HACKS
    GLfloat* normal_array;
    GLfloat* texcoord_array;
    GLfloat* vertex_array;

 protected:
    void set_name(string &name) { mesh_name = name; }
    void new_group(string &name);
    void set_group(string &name);
    void new_material(string &name);
    void set_material(string &name);

    void set_mat_ambient(GLfloat &r, GLfloat &g, GLfloat &b, GLfloat &a);
    void set_mat_diffuse(GLfloat &r, GLfloat &g, GLfloat &b, GLfloat &a);
    void set_mat_emission(GLfloat &r, GLfloat &g, GLfloat &b, GLfloat &a);
    void set_mat_specular(GLfloat &r, GLfloat &g, GLfloat &b, GLfloat &a);
    void set_mat_shininess(GLfloat &shininess);

    void add_face(Face &f);
    void add_vertex(GLfloat x, GLfloat y, GLfloat z);
    void add_normal(GLfloat x, GLfloat y, GLfloat z);
    void add_texcoord(GLfloat x, GLfloat y);

    inline GLfloat *vertexv(unsigned int &idx) {
	return &vertex_array[ idx * VERTEX_DIMENSIONS ];
    }

    inline GLfloat *normalv(unsigned int &idx) {
	return &normal_array[ idx * NORMAL_DIMENSIONS ];
    }

    inline GLfloat *texcoordv(unsigned int &idx) {
	return &texcoord_array[ idx * TEXCOORD_DIMENSIONS ];
    }



 public:
    Mesh(void);
    ~Mesh(void);

    string get_name(void) { return mesh_name; }
    void setTexture(const char *filename);
    void setTexture(GLuint texture) { texture_id = texture; }
    void generate_smooth_normals(void);
    void process(void);
    void set_spin_group(int grp) { spingroup = grp; };

    virtual void draw(void);

    GLfloat max_x, max_y, max_z;
    GLfloat min_x, min_y, min_z;

    GLfloat scale;

};

#endif
