// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Thu Feb 10 21:58:29 2005
// Last modified: Thu Feb 10 21:58:29 2005

#include "graphics/2d/slidebar2.h"
#include <iostream>

using namespace std;

static const float BAR_WIDTH  = 0.4f;
static const float BAR_HEIGHT = 0.9f;
static const float SCROLL_WIDTH = 0.6f;

SlideBar2::SlideBar2(GLfloat w, GLfloat h):
    Transitional2D(w,h),
    background(0),
    foreground(0)
{
    const string DIR = "data/images/menu";
    background = new Image(DIR + "/slider_background.png", w, h);
    float fw = BAR_WIDTH * getWidth();
    foreground = new Image(DIR + "/slider_foreground.png", fw, h);
}


SlideBar2::~SlideBar2()
{
    delete background;
    delete foreground;
}

void SlideBar2::representation(GLfloat alpha)
{
    background->draw(alpha);

    float scroll_width = getWidth() * SCROLL_WIDTH;

    foreground->position.x = (getState() - 0.5f) * scroll_width;
    foreground->setColor( 1.0f, 0.0f, 0.0f, 1.0f );
    foreground->draw(alpha);
}


