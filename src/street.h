#ifndef STREET_H
#define STREET_H
#include <iostream>
#include "mesh.h"

class Street : public Mesh {
 private:
    GLint floors;
 public:
    Street(void): Mesh(), floors(0) { };
    ~Street(void) { };
    void load(GLfloat x, GLfloat z);
    //void draw(void);
};


Street *Street_Factory(GLfloat x, GLfloat z);

#endif
