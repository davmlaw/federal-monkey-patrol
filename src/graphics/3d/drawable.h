// (C) David Lawrence released under the GPL (see license.txt)
// Started:            ? 2003
// Last modified: 27 Apr 2004

#ifndef DRAWABLE_H
#define DRAWABLE_H

#include <string>
#include <vector>
#include "collision/boundingvolume.h"
#include "sdl_opengl.h"
#include "util/mtxlib.h"
#include "util/clonable.h"

// For drawdetails_t.flags - there are 27 flag bits left (use them)
enum {
    NORTH_BIT          = 1<<0, //  Z
    EAST_BIT           = 1<<1, // +X
    SOUTH_BIT          = 1<<2, // -Z
    WEST_BIT           = 1<<3, // -X
    INSIDE_FRUSTUM_BIT = 1<<4,
};


/**
 *  3d drawing state which is passed to Drawable::draw().
 *  This gets passed by value (for recursion) a LOT
 *  @see Drawable
 *  @see Display
 */
typedef struct {
    // TODO offset & scale could be obtained from current matrix...
    vector3 offset;
    GLfloat scale;
    GLfloat camera_height;
    GLfloat lod; // level of detail [0.0 -> 1.0]
    int flags;
    bvVisitor* frustum;
} drawdetails_t;


/**
 *	Abstract composite for 3d objects
 */
class Drawable : public Clonable {
	// These guys just want to access represetation, as the
	// children will have no offset from them
	friend class DrawableFlyweight;
	friend class LODTable;
public:
    Drawable(void);
    virtual ~Drawable(void) { };
    virtual Drawable* clone() const = 0;
	virtual void draw(drawdetails_t drawdetails);
    virtual void add(Drawable *);
    virtual void setHeight(const GLfloat h);
    virtual void setPosition(const vector3& pos);
    virtual void move(const vector3& pos);
    virtual void rotate(const GLfloat x, const GLfloat y, const GLfloat z);
    virtual void setRotation(const vector3& r);
    virtual void setScale(const GLfloat s);
    void setPosition(const GLfloat x,const GLfloat y,const GLfloat z);
    GLuint getDisplayList(void);
    vector3 getPosition(void) { return position; };
    vector3 getRotation(void) { return rotation; };
    matrix44 getRotMat(void) { return rot; };
    GLfloat getScale(void) { return scale; };
    GLfloat getHeight(void) { return height; };
protected:
	/// render the geometry
	virtual void representation(drawdetails_t& drawdetails) = 0;
	/// if true draw() will not be called
	virtual int isOccluded(drawdetails_t& drawdetails) { return 0; };
private:
    void recalculateMatrix(void);
    // FIXME: using glLoadMatrix() in draw is BY FAR faster than using
    //        multiple calls to glRotate/glScale/glTranslate etc, but
    //        the code for keeping track of stuff is really ugly right now.
    matrix44 rot;
    GLfloat matrix[16];
    GLfloat height;
    vector3 position;
    vector3 rotation;
    GLfloat scale; // (could be a vector3 if want non-uniform scaling)
};

typedef std::vector<Drawable*> drawable_list_t;

#endif
