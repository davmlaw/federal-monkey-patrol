#ifndef MODEL_OBJ
#define MODEL_OBJ

#include <map>
#include <string>
#include <vector>
#include <iostream>

#include "kong.h"
#include "model.h"

class Model_OBJ;

typedef bool (Model_OBJ::* lineh)(char *data);
typedef map<string, lineh> functab_t; // Perhaps this should be a hash_map.

class Model_OBJ : public Model {
 private:
    // OBJ line handlers.
    bool line_f(char *data);
    bool line_g(char *data);
    bool line_group(char *data);
    bool line_mtllib(char *data);
    bool line_usemtl(char *data);
    bool line_v(char *data);
    bool line_vt(char *data);
    // MTL line handlers.
    bool read_mtllib(string &filename);
    bool mtl_line_newmtl(char *data);
    bool mtl_line_Ns(char *data);
    bool mtl_line_Ka(char *data);
    bool mtl_line_Kd(char *data);
    bool mtl_line_Ke(char *data);
    bool mtl_line_Ks(char *data);

    void text_reader(string &filename, functab_t &handler);

 public:
    Model_OBJ(void) : Model() { };
    ~Model_OBJ(void) { };
    virtual void load(string &filename);
};

#endif
