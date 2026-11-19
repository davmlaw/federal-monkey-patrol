// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Feb  6 00:02:51 2005
// Last modified: Sun Feb  6 00:02:51 2005

#include "graphics/2d/fogplane.h"

void FogPlane::representation(GLfloat alpha)
{
    glPushAttrib( GL_ENABLE_BIT );
    glEnable(GL_FOG);

    glTranslatef( 0.0f, 0.0f, -distance );
    fog.draw(alpha);

    glPopAttrib();
}
