#ifndef BOX_H
#define BOX_H
#include <iostream>
#include "mesh.h"

class Box : public Mesh {
 private:
    GLfloat height;
 public:
    Box(void): Mesh(), height(0) { };
    ~Box(void) { };
    void load(GLfloat x, GLfloat y, GLfloat z);
    GLfloat get_height(void) { return height; };
};


Box *Box_Factory(GLfloat x, GLfloat y, GLfloat z);

#endif
