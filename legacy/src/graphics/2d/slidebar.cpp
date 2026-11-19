// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Thu Feb 10 21:58:29 2005
// Last modified: Thu Feb 10 21:58:29 2005

#include "graphics/2d/slidebar.h"
#include <iostream>

using namespace std;

static const float BAR_WIDTH  = 0.05f;
static const float BAR_HEIGHT = 0.9f;


void SlideBar::representation(GLfloat alpha)
{
    float w = BAR_WIDTH  * getWidth();
    float h = BAR_HEIGHT * getHeight();

    Quad line( w, h );
    line.position.x = -getWidth()/2;
    line.position.y = 0.0f;
    line.setColor( 0.9f, 0.9f, 0.9f, 0.7f );
    line.draw(alpha);

    line.position.x = getWidth()/2;
    line.position.y = 0.0f;
    line.draw(alpha);

    Quad bar( getWidth(), h/2 );
    bar.setColor( 0.9f, 0.9f, 0.9f, 0.7f);
    bar.draw(alpha);

    // Little line.
    line.position.x = (getState() - 0.5f) * getWidth();
    line.position.y = 0.0f;
    line.setColor( 1.0f, 0.0f, 0.0f );
    line.draw(alpha);
}


