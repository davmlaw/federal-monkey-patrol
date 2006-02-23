// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Thu Mar 31 00:30:59 2005
// Last modified: Thu Mar 31 00:30:59 2005

#include "graphics/2d/clawalert.h"
#include "graphics/2d/image.h"
#include <iostream>

using namespace std;

#define BARH 0.01f

ClawAlert::ClawAlert(GLfloat w, GLfloat h):
    Transitional2D(w, h),
    chart(0),
    line(0)
{

    chart = new Image("data/images/menu/claw_alert.jpg", w*0.95f, h);
    line = new Quad(w, h * BARH);
    line->setColor( 1.0f, 0.0f, 0.0f );
}


ClawAlert::~ClawAlert()
{
    delete chart;
    delete line;
}


void ClawAlert::representation(GLfloat alpha)
{
    if( getState() > 0.0f ) {
	glPushAttrib(GL_ENABLE_BIT);
	chart->draw(alpha);

	glDisable(GL_TEXTURE_2D);
	glDisable(GL_DEPTH_TEST);

	float mid = (getState() - 0.5f) * getHeight();
	line->position.y = mid - BARH * getHeight();
	line->draw(alpha);

	line->position.y = mid + BARH * getHeight();
	line->draw(alpha);

	glPopAttrib();
    }
}
