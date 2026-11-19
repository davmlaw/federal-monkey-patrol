// (C) David Lawrence released under the GPL (see license.txt)
// Started:       12 Jul 2004
// Last modified: 12 Jul 2004

#include "graphics/2d/image.h"
#include <iostream>

using namespace std;


Image::Image(string filename, GLfloat w, GLfloat h):
    Quad(w,h), aspectLock(true)
{
    tex = Texture_Factory(filename);
}


Image::~Image()
{
    delete tex;
}


void Image::representation(GLfloat alpha)
{
    tex->activate();
    Quad::representation(alpha);
}


void Image::setWidth(GLfloat w)
{
    size.x = w;
    if( aspectLock ) {
	size.y = w / tex->getAspectRatio();
    }
}


void Image::setHeight(GLfloat h)
{
    size.y = h;
    if( aspectLock ) {
	size.x = h * tex->getAspectRatio();
    }
}
