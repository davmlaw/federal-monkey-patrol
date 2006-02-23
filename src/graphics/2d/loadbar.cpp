// (C) David Lawrence released under the GPL (see license.txt)
// Started:       25 Jun 2004
// Last modified: 20 Feb 2005
// This is just a quick graphics hack made instead of doing something useful ;)

#include "graphics/2d/image.h"
#include "graphics/2d/loadbar.h"
#include "graphics/2d/text2d.h"
#include "graphics/display.h"
#include "util/MersenneTwister.h"
#include "util/properties.h"
#include "util/scalar.h"
#include "util/util.h"
#include <iostream>
#include <string>

using namespace std;

static const float BORDER_SPACING = 0.1f;
static const float X_MIN = BORDER_SPACING;
static const float X_MAX = Display::ORTHO_W - BORDER_SPACING;
static const float Y_MIN = BORDER_SPACING;
static const float Y_MAX = Display::ORTHO_H - 2 * BORDER_SPACING; // push down

LoadBar::LoadBar(): Transitional2D()
{

	// The idea behind this bar came from a souvineer coffee mug I bought on the
	// Seattle waterfront - too much coffee? coffee on the brain?
	// I originally randomly picked coffee mug or night time colours, but night
	// time looks better, so we'll always go with that. Left here if you like it
	//Properties<Scalar> prop("data/seattle.properties");
	Properties<Scalar> prop("data/etc/citynight.properties");

	hexcolor( bgcolor,      prop.get("bgcolor"));
	hexcolor( skylinecolor, prop.get("skylinecolor"));
	hexcolor( windowcolor,  prop.get("windowcolor"));
	hexcolor( barcolor,     prop.get("barcolor"));
	bg_line_width         = prop.get("bg_line_width");
	bar_line_width        = prop.get("bar_line_width");
	win_w                 = prop.get("win_w");
	win_h                 = prop.get("win_h");

	text = new Text2D("generating skyscrapers", 0.2f);

	// Flare
	flare = new Image(prop.get("flare_image"), 0.05f, 0.05f);
	GLfloat col[4];
	hexcolor( col, prop.get("flare_color") );
	flare->setColor( col[0], col[1], col[2], col[3] );

	GLfloat x = X_MIN;
	GLfloat y = Y_MIN;
	GLfloat val;

	MTRand mt;

	while( x < X_MAX ) {
		// across between buildings
		val = (X_MAX - X_MIN) / 100.0f;
		x += val;
		skyline_segments.push_back(val);

		// Up
		val = (Y_MAX-Y_MIN)/8.0f; // minimum...
		val += (float)mt.rand() * (Y_MAX - y);
		if( val > (Y_MAX-y) )
			val = Y_MAX-y;
		y += val;
		skyline_segments.push_back(val);

		const float FUDGE = 10;

		// Across (roof length)
		val = (X_MAX-X_MIN) / (FUDGE * 2.0f);// minimum
		val += (float)mt.rand() * (X_MAX - X_MIN)/(GLfloat)FUDGE;
		if( x + val > X_MAX ) {
			skyline_segments.push_back(X_MAX-x);
			break;
		}
		x += val;
		skyline_segments.push_back(val);

		const float MIN_HEIGHT_FOR_WINDOWS = 0.0f;
		const float MIN_WIDTH_FOR_WINDOWS = 2*win_w;
		if( y>MIN_HEIGHT_FOR_WINDOWS && val>MIN_WIDTH_FOR_WINDOWS ) {
			vector2 win;
			int num_windows = 1 + mt.randInt(2);
			for( int i=0 ; i<num_windows ; i++ ) {
				win.x = x - (mt.randInt(1)? 0.25f : 0.75f) * val;
				win.y = y - (i+1)*3.0f * win_h;
				windows.push_back(win);
			}
		}

		// Down
		val = (Y_MAX-Y_MIN)/8.0f; // minimum...
		val += (float)mt.rand() * (y - Y_MIN);
		if( val > (y-Y_MIN) )
			val = y-Y_MIN;
		y -= val;
		skyline_segments.push_back(val);
	}

	total_skyline_length = 0.0f;
	vector<GLfloat>::iterator it;
	for(it=skyline_segments.begin() ; it!=skyline_segments.end() ; ++it) {
		total_skyline_length += *it;
	}



}


LoadBar::~LoadBar()
{
	delete flare;
	delete text;
}


void LoadBar::representation(GLfloat alpha)
{
	glPushAttrib(GL_ALL_ATTRIB_BITS);
	// HACK: haven't fixed up for new ortho projection settings....
	glTranslatef( -Display::ORTHO_W/2, -Display::ORTHO_H/2, 0.0f );

	glClearColor( bgcolor[0], bgcolor[1], bgcolor[2], 0.0f );
	glClear( GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT );

	text->draw(alpha);

	float oldwidth;
	glGetFloatv(GL_LINE_WIDTH, &oldwidth);
	glDisable(GL_DEPTH_TEST);
	glDisable(GL_TEXTURE_2D);
	glDisable(GL_CULL_FACE);
	glDisable(GL_FOG);
	glDisable(GL_LIGHTING);

	glColor4fv(windowcolor);
	vector<vector2>::iterator vi;
	glBegin(GL_QUADS);
	for( vi=windows.begin() ; vi != windows.end() ; ++vi ) {
		glVertex2f( vi->x - win_w, vi->y + win_h );
		glVertex2f( vi->x - win_w, vi->y - win_h );
		glVertex2f( vi->x + win_w, vi->y - win_h );
		glVertex2f( vi->x + win_w, vi->y + win_h );
	}
	glEnd();

	GLfloat length;
	vector2 pos;

	for( int j=0 ; j<2 ; j++ ) {
		GLfloat sum = 0.0f;

		if( (j&1) == 0 ) {
			glLineWidth(bg_line_width);
			glColor4fv( skylinecolor );
		} else {
			glLineWidth(bar_line_width);
			glColor4fv( barcolor );
			glEnable(GL_BLEND);
		}

		int i=0;
		pos.x = X_MIN;
		pos.y = Y_MIN;

		glBegin(GL_LINE_STRIP);
		glVertex2f( pos.x, pos.y );
		vector<GLfloat>::iterator it;
		for( it=skyline_segments.begin() ; it!=skyline_segments.end() ; ++it) {
			length = *it;
			if( j&1 ) {
				if( sum / total_skyline_length > getState() )
					break;
				GLfloat maxlength= getState()*total_skyline_length - sum;
				if( length > maxlength )
					length = maxlength;
			}

			sum += *it;

			if( i&1 ) { // Odd
				if( (i+1)%4 )
					pos.y += length; // up
				else
					pos.y -= length; // down
			} else {
				pos.x += length;
			}
			++i;
			glVertex2f( pos.x, pos.y );
		}
		glEnd(); // GL_LINE_STRIP
	}

	flare->position = pos;
	flare->setRotation( getState() * 360.0f * 5);
	flare->draw(alpha);

	glPopAttrib();
}
