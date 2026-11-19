// (C) David Lawrence released under the GPL (see license.txt)
// Started:       15 Sep 2004
// Last modified: 05 Dec 2004

#include "game/transition/transitionwipe.h"
#include "graphics/3d/model.h"
#include "graphics/display.h"
#include <iostream>

using namespace std;

//Hack: Done with DEPTH test (my pov cards stencil doesn't work right in Linux)
void TransitionWipe::representation(GLfloat alpha)
{
	glPushAttrib(GL_DEPTH_BUFFER_BIT);

	if( prev )
		(*prev)->play(0, NULL);

	glClear( GL_DEPTH_BUFFER_BIT );
	glColorMask( GL_FALSE, GL_FALSE, GL_FALSE, GL_FALSE );
	glDepthMask( GL_TRUE );
	glEnable( GL_DEPTH_TEST );

	renderMask();

	glColorMask( GL_TRUE, GL_TRUE, GL_TRUE, GL_TRUE );
	glDisable( GL_DEPTH_TEST );
	glDepthFunc( GL_GEQUAL );
	glDepthMask( GL_FALSE );

	renderColor();

	if( next ) {
		glEnable(GL_DEPTH_TEST);
		(*next)->play(0, NULL);
	}

	glPopAttrib();
}



void TransitionAngleWipe::renderMask(void)
{
	GLfloat a2 = Display::ORTHO_W * Display::ORTHO_W;
	GLfloat b2 = Display::ORTHO_H * Display::ORTHO_H;
	GLfloat len = sqrt( a2 + b2 ); // length of screen diagonal (widest point)
	GLfloat hlen = len / 2;
	GLfloat left   = -hlen;
	GLfloat right  =  hlen;
	GLfloat bottom = -hlen;

	GLfloat pos = getState() * len;

	glPushMatrix();
	glRotatef( angle, 0.0f, 0.0f, -1.0f ); // clockwise
	glBegin(GL_QUADS);
	glVertex2f(  left, bottom + pos );
	glVertex2f(  left, bottom );
	glVertex2f( right, bottom );
	glVertex2f( right, bottom + pos );
	glEnd();
	glPopMatrix();
}


// Homer: Why eat hamburger when you can eat steak? Star-wipe... and we're out!
void TransitionStarWipe::renderMask(void)
{
	render_star(GL_POLYGON);
}


void TransitionStarWipe::renderColor(void)
{
	glPushAttrib(GL_LINE_BIT | GL_ENABLE_BIT);

	glLineWidth(10.0f);
	glDisable(GL_TEXTURE_2D);
	glColor3f( 1.0f, 1.0f, 1.0f );
	render_star(GL_LINE_LOOP);

	glPopAttrib();
}


void TransitionStarWipe::render_star(GLenum primitive)
{
	const float STAR_OUT_DIST = Display::ORTHO_W * 1.4f;
	const float STAR_IN_DIST = Display::ORTHO_W * 0.6f;
	const int STAR_POINTS = 10;
	const float rot = 360.0f / STAR_POINTS;

	vector3 center(0.0f, 0.0f, 0.0f);
	vector3 up(0.0f, 1.0f, 0.0f);
	vector3 in  =  STAR_IN_DIST * up * getState();
	vector3 out = STAR_OUT_DIST * up * getState();

	glBegin(primitive);
	// The reason for the offset by 1 is because GL_POLYGON renders CONVEX
	for( int i=1 ; i<STAR_POINTS+1 ; ++i ) {
		matrix44 rmat = RotateRadMatrix44('z', DegToRad(i * rot));
		vector3 pos = center + rmat * (i&1? in : out);
		glVertex2f( pos.x, pos.y );
	}
	glEnd();
}



// Maybe use a triangle fan?
void TransitionSpin::renderMask(void)
{
	vector3 center(0.0f, 0.0f, 0.0f);
	vector3 up(0.0f, 2.0f, 0.0f);
	vector3 ray1 = center + up, ray2;

	glBegin(GL_POLYGON);
	for( float deg=0.0f ; deg < getState()*360.0f ; deg += 1.0f ) {
		ray2 = center + up * RotateRadMatrix44('z', DegToRad(deg));
		glVertex2f( center.x, center.y );
		glVertex2f(   ray1.x,   ray1.y );
		glVertex2f(   ray2.x,   ray2.y );
		ray1 = ray2;
	}
	glEnd();
}

