// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Mon Jul 11 23:30:36 2005
// Last modified: Mon Jul 11 23:30:36 2005

#include "blank.h"

using namespace std;


Blank::Blank():
    background(0)
{
    background = new Quad(Display::ORTHO_W, Display::ORTHO_H);
}


Blank::~Blank()
{
    delete background;
}


void Blank::setColor(GLfloat r, GLfloat g, GLfloat b)
{
    background->setColor( r, g, b );
}


void Blank::_play(Uint32 msecs, Input* input, float alpha)
{
    glPushAttrib(GL_ENABLE_BIT);
    glDisable(GL_TEXTURE_2D);
    Display::Instance().draw_context_2d( background, alpha );
    glPopAttrib();
}
