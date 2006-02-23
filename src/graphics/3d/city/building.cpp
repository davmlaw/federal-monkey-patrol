// (C) David Lawrence released under the GPL (see license.txt)
// Started:       28 Apr 2004
// Last modified: 28 Apr 2004
// -[28apr04]- dlawrence - Building could be a skyscraper with 1 step, but
//                         I want the ability to have different roof tex's and
//                         vertical stripes as there are no steps
// -[25May04]- dlawrence - Unfortunately, the overhead of vertex buffers makes
//                         them not worth it for buildings.


#include "graphics/3d/city/building.h"
#include "util/util.h"
#include <iostream>
#include <math.h>

#define DO_TOP 0
#define NUM_TEX 1

using namespace std;

static const float APPROX_WINDOW_SIZE = 18;


Building::Building(MTRand& mt, GLfloat x_size, GLfloat y_size, GLfloat z_size):
Drawable()
{
	setWidth( x_size );
	setHeight( y_size );
	setLength( z_size );

	// floors cast to int for no fractional windows
	floors = (int)(y_size / APPROX_WINDOW_SIZE);
	if( floors < 1 ) ERR_QUIT("building has <1 floors", 1);
	inv_window_size = 1.0f / (y_size / floors);

	// Window texture.
	static const unsigned int NUM_WINDOW_TEXTURES = 5;
	static const string window_tex[NUM_WINDOW_TEXTURES] = {
		"win_brick.jpg",
		"win_gray.jpg",
		"win_redbrick.jpg",
		"win_dark_gray.jpg",
		"win_concrete.jpg",
	};

	string dir("data/images/city/");
	walls = Texture_Factory( dir + window_tex[ mt.randInt(NUM_TEX-1) ]);
	roof = Texture_Factory( dir + string("building_top_dark2.jpg"));
	gray = 0.5f + 0.1f * (mt.rand()*6.0f);
}


Building::~Building(void)
{
	delete walls;
	delete roof;
}


void Building::representation(drawdetails_t& drawdetails)
{
	//	glColor3f( gray, gray, gray );

	GLfloat h = getHeight();
	GLfloat hlength = length * 0.5f;
	GLfloat hwidth = width * 0.5f;

	GLint s_w = (GLint)(width * inv_window_size);
	GLint s_l = (GLint)(length * inv_window_size);

	walls->activate();
	glBegin( GL_TRIANGLE_STRIP );
	glNormal3f(  0.0f, 0.0f,  1.0f ); // +Z
	glTexCoord2i( 0, 0 );      glVertex3f( -hwidth,    h,  hlength );
	glTexCoord2i( 0, floors ); glVertex3f( -hwidth, 0.0f,  hlength );
	glTexCoord2i( s_w, 0 );      glVertex3f(  hwidth,    h,  hlength );
	glTexCoord2i( s_w, floors ); glVertex3f(  hwidth, 0.0f,  hlength );

	glNormal3f(  1.0f, 0.0f,  0.0f ); // +X
	glTexCoord2i( 0, 0 );      glVertex3f(  hwidth,    h,  hlength );
	glTexCoord2i( 0, floors ); glVertex3f(  hwidth, 0.0f,  hlength );
	glTexCoord2i( s_l, 0 );      glVertex3f(  hwidth,    h, -hlength );
	glTexCoord2i( s_l, floors ); glVertex3f(  hwidth, 0.0f, -hlength );

	glNormal3f(  0.0f, 0.0f, -1.0f ); // -Z
	glTexCoord2i( 0, 0 );      glVertex3f(  hwidth,    h, -hlength );
	glTexCoord2i( 0, floors ); glVertex3f(  hwidth, 0.0f, -hlength );
	glTexCoord2i( s_w, 0 );      glVertex3f( -hwidth,    h, -hlength );
	glTexCoord2i( s_w, floors ); glVertex3f( -hwidth, 0.0f, -hlength );

	glNormal3f( -1.0f, 0.0f,  0.0f ); // -X
	glTexCoord2i( 0, 0 );      glVertex3f( -hwidth,    h, -hlength );
	glTexCoord2i( 0, floors ); glVertex3f( -hwidth, 0.0f, -hlength );
	glTexCoord2i( s_l, 0 );      glVertex3f( -hwidth,    h,  hlength );
	glTexCoord2i( s_l, floors ); glVertex3f( -hwidth, 0.0f,  hlength );
	glEnd();

#if DO_TOP
	roof->activate();
	glBegin( GL_QUADS );
	glNormal3f( 0.0f, 1.0f, 0.0f );
	glTexCoord2i(0,0); glVertex3f( -hwidth, h, -hlength );
	glTexCoord2i(1,0); glVertex3f( -hwidth, h,  hlength );
	glTexCoord2i(1,1); glVertex3f(  hwidth, h,  hlength );
	glTexCoord2i(0,1); glVertex3f(  hwidth, h, -hlength );
	glEnd();

#endif
	//	glColor3f(1.0f, 1.0f, 1.0f);
}


