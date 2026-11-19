// (C) David Lawrence released under the GPL (see license.txt)
// Started:       20 Apr 2004
// Last modified: 31 Apr 2004

#include "graphics/3d/billboards.h"
#include <iostream>
#include <map>
#include <string>
#include <vector>

using namespace std;

typedef map< GLuint , vector<billboard_t> > BillboardTexMap;
BillboardTexMap v_billboards;
BillboardTexMap h_billboards;

// FIXME: do this properly for all rotations of all billboards...
// at the moment they are separate lists, ie if they have similar textures
// draw them all together...

void billboards_draw(void)
{
    glPushAttrib(GL_ALL_ATTRIB_BITS);
    glDisable(GL_LIGHTING);
    glDisable(GL_CULL_FACE);
    glDepthMask(GL_FALSE);
    glEnable(GL_BLEND);

    BillboardTexMap::iterator p;
    vector<billboard_t>::iterator bb;
    for( p=v_billboards.begin() ; p!= v_billboards.end() ; ++p ) {
	texture_details_t td = { p->first, 1.0f };
	Texture tex(td);
	tex.activate();
	// Turn off texture repeating (on by default)
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP);
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP);

	for( bb = p->second.begin() ; bb != p->second.end() ; ++bb ) {
	    glPushMatrix();
	    glTranslatef( bb->pos.x, bb->pos.y, bb->pos.z );
	    glRotatef( bb->rot, 0.0f, 1.0f, 0.0f );

	    GLfloat hwidth  =  bb->width * 0.5f;
	    GLfloat hheight = bb->height * 0.5f;

	    glBegin(GL_QUADS);
	    glTexCoord2f(0.0f, 0.0f);
	    glVertex3f( -hwidth,  hheight, 0.0f);
	    glTexCoord2f(0.0f, 1.0f);
	    glVertex3f( -hwidth, -hheight, 0.0f);
	    glTexCoord2f(1.0f, 1.0f);
	    glVertex3f(  hwidth, -hheight, 0.0f);
	    glTexCoord2f(1.0f, 0.0f);
	    glVertex3f(  hwidth,  hheight, 0.0f);
	    glEnd();
	    glPopMatrix();
	}
	p->second.clear(); //empty vector
    }


    for( p=h_billboards.begin() ; p!= h_billboards.end() ; ++p ) {
	//cout << "h = " << p->second.size() << "\n";

	texture_details_t td = { p->first, 1.0f };
	Texture tex(td);
	tex.activate();
	// Turn off texture repeating (on by default)
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP);
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP);

	for( bb = p->second.begin() ; bb != p->second.end() ; ++bb ) {
	    glPushMatrix();
	    glTranslatef( bb->pos.x, bb->pos.y, bb->pos.z );
	    glRotatef( bb->rot, 0.0f, 1.0f, 0.0f );

	    GLfloat hwidth  =  bb->width * 0.5f;
	    GLfloat hheight =  bb->height * 0.5f;

	    glBegin(GL_QUADS);
	    glTexCoord2f(0.0f, 0.0f);
	    glVertex3f( -hwidth,  0.0f, hheight);
	    glTexCoord2f(0.0f, 1.0f);
	    glVertex3f( -hwidth, 0.0f, -hheight);
	    glTexCoord2f(1.0f, 1.0f);
	    glVertex3f(  hwidth, 0.0f, -hheight);
	    glTexCoord2f(1.0f, 0.0f);
	    glVertex3f(  hwidth,  0.0f, hheight);
	    glEnd();
	    glPopMatrix();
	}
	p->second.clear(); //empty vector
    }


    glPopAttrib();
}


void billboards_addv(GLuint textureid, billboard_t& b)
{
    v_billboards[textureid].push_back(b);
}


void billboards_addh(GLuint textureid, billboard_t& b)
{
    h_billboards[textureid].push_back(b);
}


