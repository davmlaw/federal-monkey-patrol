#ifndef ENTITY_H
#define ENTITY_H

#include <ode/ode.h>
#include "drawable.h"
#include "mtxlib.h"

class Entity {
 private:
    myDrawable *drawable;

 public:
    Entity(void);
    ~Entity(void) { }
    void draw(void);
    void setDrawable(myDrawable *d) { drawable = d; }

    vector3 pos;
    GLfloat yaw, pitch, roll;

    dBodyID body;
    dGeomID geom;

    //void setX(GLfloat x_in) { x = x_in; }
    //void setY(GLfloat y_in) { y = y_in; }
    //void setZ(GLfloat z_in) { z = z_in; }
};


#endif
