// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Wed Apr 20 00:34:48 2005
// Last modified: Wed Apr 20 00:34:48 2005

#include "graphics/2d/shadow.h"


using namespace std;


Shadow::Shadow(GLfloat w, GLfloat h):
    Drawable2D(w,h)
{
    tex = Texture_Factory("data/images/giant_claw_outline.png");
    quad = new Quad(w,h);
    quad->setColor( 0.1f, 0.1f, 0.1f, 0.5f );
}


Shadow::~Shadow()
{
    delete tex;
    delete quad;
}


void Shadow::representation(float alpha)
{
    tex->activate();
    quad->draw(alpha);

}
