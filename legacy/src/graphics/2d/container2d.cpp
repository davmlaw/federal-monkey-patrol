// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Tue Apr 12 00:38:50 2005
// Last modified: Tue Apr 12 00:38:50 2005

#include "graphics/2d/container2d.h"
#include <iostream>

using namespace std;


Container2D::Container2D(GLfloat w, GLfloat h): Drawable2D(w,h)
{

}


Container2D::~Container2D()
{
    vector<Drawable2D*>::iterator i, end=children.end();
    for( i=children.begin() ; i != end ; ++i ) {
	delete *i;
    }
}


void Container2D::add(Drawable2D* d, int alignment)
{
    if( alignment ) {
	float hwidth  = d->getWidth() /2.0f;
	float hheight = d->getHeight()/2.0f;
	if( alignment & LEFT )
	    d->position.x = left() + hwidth;
	else if( alignment & RIGHT )
	    d->position.x = right() - hwidth;

	if( alignment & TOP )
	    d->position.y = top() - hheight;
	else if( alignment & BOTTOM )
	    d->position.y = bottom() - hheight;
    }
    children.push_back(d);
}


void Container2D::representation(GLfloat alpha)
{
    vector<Drawable2D*>::iterator i, end=children.end();
    for( i=children.begin() ; i != end ; ++i ) {
	(*i)->draw(alpha);
    }
}



