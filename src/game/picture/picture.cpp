// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Mon Jul 11 23:24:30 2005
// Last modified: Mon Jul 11 23:24:30 2005

#include "picture.h"
#include "graphics/2d/image.h"

using namespace std;


Picture::Picture():
    image(0),
    show_time(0),
    time_displayed(0)
{
    color[0]=1.0f; color[1]=1.0f; color[2]=1.0f; color[3]=1.0f;
}


Picture::~Picture()
{
    delete image;
}


void Picture::_load(void) {
    image = new Image(filename, Display::ORTHO_W, Display::ORTHO_H);
    image->setColor( color );
}


void Picture::_play(Uint32 msecs, Input* input, float alpha) {
    time_displayed += msecs;
    Display::Instance().draw_context_2d( image, alpha );
    if( time_displayed > show_time )
	GameComponent::status = NEXT;
}

