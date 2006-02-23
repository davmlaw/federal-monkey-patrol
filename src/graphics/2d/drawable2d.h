// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sat Feb  5 23:47:52 2005
// Last modified: Sat Feb  5 23:47:52 2005

#ifndef DRAWABLE2D
#define DRAWABLE2D

#include "../../sdl_opengl.h"
#include "util/flux.h"
#include "util/mtxlib.h"

/**
 * 2D Drawable.
 * Draw things around the center so that rotation works correctly.
 * Screen is (1.0, 0.75) position is relative to bottom left of screen (0,0)
 */
class Drawable2D {
public:
    Drawable2D();
    Drawable2D(GLfloat w, GLfloat h);
    virtual ~Drawable2D() { };
    void draw(GLfloat alpha);
    vector2 getSize(void) { return size; };
    float getWidth(void) { return size.x; };
    float getHeight(void) { return size.y; };
    virtual void setWidth(GLfloat w) { size.x = w; };
    virtual void setHeight(GLfloat h) { size.y = h; };
    void setRotation(GLfloat r) { rotation = r; };
    void setColor(GLfloat* c) {
	for( int i=0 ; i<4 ; ++i )
	    color[i] = c[i];
    };
    void setColor(GLfloat r, GLfloat g, GLfloat b, GLfloat a = 1.0f) {
	color[0] = r; color[1] = g; color[2] = b; color[3] = a;
    };
    GLfloat left(void)  { return  getWidth()  * -0.5f; };
    GLfloat right(void) { return  getWidth()  *  0.5f; };
    GLfloat top(void)   { return  getHeight() *  0.5f; };
    GLfloat bottom(void){ return  getHeight() * -0.5f; };
    vector2 position;
protected:
	/// Draw 2d graphics here
    virtual void representation(GLfloat alpha) = 0;
    vector2 size;
    GLfloat rotation;
    GLfloat color[4];
};


// A 2d drawable that has a state between 0 -> 1
class Transitional2D : public Drawable2D, public Flux {
public:
    Transitional2D(): Drawable2D() { };
    Transitional2D(GLfloat w, GLfloat h): Drawable2D(w,h) {};
    virtual ~Transitional2D() { };
};


class Quad : public Drawable2D {
public:
    Quad(GLfloat w, GLfloat h):
	Drawable2D(w,h) { };
    virtual ~Quad() { };
protected:
    virtual void representation(GLfloat alpha);
};


#endif // DRAWABLE2D
