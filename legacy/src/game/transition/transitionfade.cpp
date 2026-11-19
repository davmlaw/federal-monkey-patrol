// (C) David Lawrence released under the GPL (see license.txt)
// Started:       15 Sep 2004
// Last modified: 05 Dec 2004

#include "game/transition/transitionfade.h"
#include "graphics/display.h"
#include <iostream>

using namespace std;

// Draw prev, then slowly draw next ontop from 0 to full opacity
void TransitionFade::representation(GLfloat alpha)
{
    glPushAttrib(GL_ENABLE_BIT);
    
    glColor3f(1.0f, 1.0f, 1.0f );
    if( prev )
	(*prev)->play(0, NULL);

    if( next ) {
	glEnable(GL_BLEND);
	(*next)->play(0, NULL, getState());
    }
    glPopAttrib();
}

