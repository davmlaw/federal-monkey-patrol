#ifndef MODEL_H
#define MODEL_H
#include <iostream>
#include "mesh.h"

class Model : public Mesh {
 public:
    Model(void): Mesh() { std::cout << "Model()\n"; };
    ~Model(void) { std::cout << "~Model()\n"; };
    virtual void load(string &filename) = 0;
};


Model *Model_Factory(string filename);
Model *Model_Factory(string filename, string texturename);

#endif
