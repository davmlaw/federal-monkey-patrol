// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sat May  7 11:46:03 2005
// Last modified: Sat May  7 11:46:03 2005

#include "kong.h"
#include "subdividedquad.h"

using namespace std;


SubdividedQuad::SubdividedQuad(float xw, float zw, unsigned int s):
    x_width(xw),
    z_width(zw),
    subdivisions(s),
    repeats(1),
    ou(0.0f),
    ov(0.0f)
{


}


SubdividedQuad::~SubdividedQuad()
{

}


void SubdividedQuad::representation(drawdetails_t& drawdetails)
{
    GLfloat inc     = repeats / (GLfloat)subdivisions;
    GLfloat shift   = x_width / (GLfloat)subdivisions;
    GLfloat hlength = x_width / 2;
    GLfloat left    = -hlength;
    GLfloat right   = left;
    
    GLfloat u = ou;
    GLfloat v = ov;

    glNormal3f( 0.0f, 1.0f, 0.0f ); // up
    
    for( unsigned int i=0 ; i<subdivisions ; i++ ) {
	right += shift;

	GLfloat z_pos = -hlength; // furthest -Z
	glBegin(GL_QUAD_STRIP);
	
	for( unsigned int j=0 ; j<subdivisions+1 ; j++ ) {
	    glTexCoord2f( u, v );
	    glVertex3f( right, 0.0f, z_pos );
	    glTexCoord2f( u-inc, v );
	    glVertex3f(  left, 0.0f, z_pos );
	    
	    v += inc;
	    z_pos += shift;
	}	
	glEnd();
	
	u += inc;
	left = right;
    }
}

