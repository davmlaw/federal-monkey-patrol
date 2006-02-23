// (C) David Lawrence released under the GPL (see license.txt)
// Started:       16 Feb 2004
// Last modified: 26 Apr 2004

#include "../../sdl_opengl.h"
#include "graphics/3d/drawable.h"
#include "graphics/display.h"
#include "util/util.h"
#include <algorithm>
#include <iostream>
#include <math.h>

using namespace std;

////////////////////// Drawable /////////////// 
Drawable::Drawable(void):
    height(0.0f),
    position(0.0f, 0.0f, 0.0f),
    rotation(0.0f, 0.0f, 0.0f),
    scale(1.0f)
{
    rot.identity();
    // Identity matrix.
    memset( matrix, 0, 16 * sizeof(GLfloat) );
    matrix[ 0] = 1.0f;
    matrix[ 5] = 1.0f;
    matrix[10] = 1.0f;
    matrix[15] = 1.0f;
}


void Drawable::draw(drawdetails_t drawdetails)
{
    drawdetails.offset += position;
    drawdetails.scale *= scale;

    // use lazy evaluation to avoid testing those known to be visible
    if( drawdetails.flags & INSIDE_FRUSTUM_BIT || !isOccluded(drawdetails) ) {
	glPushMatrix();
	glMultMatrixf( matrix );
	representation(drawdetails);
	glPopMatrix();
    }
}


GLuint Drawable::getDisplayList(void)
{
    drawdetails_t drawdetails;
    //drawdetails.lod = 1.0f;
    drawdetails.scale = 1.0f;
    drawdetails.flags |= INSIDE_FRUSTUM_BIT;

    GLuint list = glGenLists(1);
    glNewList(list, GL_COMPILE);
    representation(drawdetails);
    glEndList();
    return list;
}


void Drawable::recalculateMatrix(void)
{
    matrix44 trans = TranslateMatrix44(position.x, position.y, position.z);
    matrix44 sc = ScaleMatrix44( scale, scale, scale, 1.0f );
    matrix44 result = rot * sc * trans;
    convert_mtx_to_glmatrix(result, matrix);
}


void Drawable::setHeight(const GLfloat h)
{
    height = h;
}

void Drawable::setPosition(const GLfloat x, const GLfloat y, const GLfloat z)
{
    setPosition(vector3(x,y,z));
}

void Drawable::setPosition(const vector3& pos)
{
    position = pos;
    matrix[12] = position.x;
    matrix[13] = position.y;
    matrix[14] = position.z;
}


void Drawable::move(const vector3& mov)
{
    position += mov;
    matrix[12] = position.x;
    matrix[13] = position.y;
    matrix[14] = position.z;
}


void Drawable::rotate(const GLfloat x, const GLfloat y, const GLfloat z)
{
    rot = eulers_to_matrix(rotation);
    rot *= RotateRadMatrix44(DegToRad(x),DegToRad(y),DegToRad(z));
    rotation = matrix_to_eulers(rot);
    recalculateMatrix();
}


void Drawable::setRotation(const vector3& r)
{
    rotation = r;
    rot = eulers_to_matrix(r);
    recalculateMatrix();
}

void Drawable::setScale(const GLfloat s)
{
    scale *= s;
    matrix[ 0] *= s;
    matrix[ 5] *= s;
    matrix[10] *= s;
    //	recalculate_matrix();
}


// It is an error to call the default add()
// Subclass should redefine it if it needs it.
void Drawable::add(Drawable *d)
{
    throw "add() not defined for object";
}


