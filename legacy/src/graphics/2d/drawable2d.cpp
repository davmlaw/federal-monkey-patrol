#include "graphics/2d/drawable2d.h"


Drawable2D::Drawable2D(void): position(0.0f, 0.0f),
			      size(0.0f, 0.0f),
			      rotation(0.0f)
{
    setColor( 1.0f, 1.0f, 1.0f );
}


Drawable2D::Drawable2D(GLfloat w, GLfloat h): position(0.0f, 0.0f),
					      size(w,h),
					      rotation(0.0f)
						
{
    setColor( 1.0f, 1.0f, 1.0f );
}


void Drawable2D::draw(GLfloat alpha)
{
    glPushMatrix();
    glTranslatef( position.x, position.y, 0.0f );
    glRotatef( rotation, 0.0f, 0.0f, 1.0f );
    
    alpha *= color[3]; //blend
    glColor4f( color[0], color[1], color[2], alpha );
    representation(alpha);

    glPopMatrix();
}


void Quad::representation(GLfloat alpha)
{
    // FIXME: Could set these in overrideen setWidth/setHeight
    vector2 hsize = size / 2;

    glBegin(GL_QUADS);
    glTexCoord2f(0.0f, 0.0f); glVertex2f( -hsize.x,  hsize.y ); // TL
    glTexCoord2f(0.0f, 1.0f); glVertex2f( -hsize.x, -hsize.y ); // BR
    glTexCoord2f(1.0f, 1.0f); glVertex2f(  hsize.x, -hsize.y ); // BR
    glTexCoord2f(1.0f, 0.0f); glVertex2f(  hsize.x,  hsize.y ); // TR
    glEnd();
}
