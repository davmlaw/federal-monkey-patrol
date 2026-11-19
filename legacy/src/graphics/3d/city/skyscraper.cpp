// (C) David Lawrence released under the GPL (see license.txt)
// Started:       14 Mar 2004
// Last modified: 16 May 2004
// -[16Mar04]- Used Interleaved array to reduce CPU% of representation from
//             ~50% (3.42us/call) to less than %2 (0.12us/call)

#include "graphics/3d/city/skyscraper.h"
#include "util/util.h"
#include <algorithm>
#include <cmath>
#include <iostream>

#define NUM_TEX 1

using namespace std;

// FIXME: put into config
static const float SPIRE_MIN_SKYSCRAPER_HEIGHT = 1000.0f;
static const float SPIRE_MIN_SLOPE = 10.0f;
static const float SPIRE_MAX_SLOPE = 20.0f;
static const float SPIRE_CHANCE_RATIO = 0.3f; // (buildings over MIN_HEIGHT)
static const float SPIRE_RATIO = 0.2f;

static const float APPROX_WINDOW_SIZE = 18.0f;
static const float MIN_HEIGHT_FOR_STEPS = 100.0f;
static const float STRETCHY_BELLY_RATIO = 0.4f;
static const float SMALL_PENALTY = 800;


Skyscraper::Skyscraper(MTRand& mt, GLfloat w, GLfloat h) : Drawable()
{
	setWidth( w );
	setHeight( h );

	spire = 0.0f;

	// Spire
	if( h >= SPIRE_MIN_SKYSCRAPER_HEIGHT && mt.rand() < SPIRE_CHANCE_RATIO ) {
		spire = h  * 0.20f;
		h -= spire;
	}

	int floors = (int)(h / APPROX_WINDOW_SIZE);
	if( floors < 1 ) ERR_QUIT("Skyscraper has <1 floors", 1);
	window_size = h / floors;

	//	cout << "Orig height = " << getHeight() << " floors = " << floors << " height = "
	//	     << window_size * floors + spire << endl;
	int stretchy_belly_floors = (int)(floors*STRETCHY_BELLY_RATIO*0.01f);

	floors -= stretchy_belly_floors;
	//	cout << "stretchy belly floors = " << stretchy_belly_floors << endl;
	//	cout << "floors = " << floors << endl;

	// STEPS
	num_steps = (floors / (mt.randInt(4)+10)) * 2; // must be even
	num_steps = max( 2U, num_steps ); // use minimum of 2 steps.

	//	cout << "num-steps = " << num_steps << endl;
	step = new float[num_steps];

	//  VERTICAL STEPS.
	// From Knuth's seminumerical methods pick random m out of a set of n 
	unsigned int m = num_steps/2;
	int n = floors;
	int s = 0;
	int last = 0;
	for( int i=0 ; i<n ; i++ ) {
		if( mt.randInt(n-i-1) < m ) {
			step[s] = (float)(i - last);
			s += 2; // next vertical step.
			last = i;
			m--;
		}
	}

	// Adjust for rounding errors to get it up to requested height
	if( last != floors )
		step[0] += (floors - last); // add to start...

	// stretch the middle...
	step[(num_steps/4)*2] += stretchy_belly_floors;

	//  HORIZONTAL STEPS
	for( unsigned int j=1 ; j < num_steps ; j += 2 )
		step[j] = (w / 2.0f) / (num_steps/2.0f);

#if 0 // FIXME: implement this
	// an adjustment so that there are no really long thin
	// bits at the top (this looks funny)
	if( num_steps >= 3 ) {
		GLfloat top_h_w_ratio = step[num_steps-2] / step[num_steps-1];
		GLfloat all_h_w_ratio = getHeight() / getWidth();
		if( top_h_w_ratio > all_h_w_ratio / 10 ) {
			GLfloat adjustment = step[num_steps-3] * 0.9f;
			step[num_steps-1] += adjustment;
			step[num_steps-3] -= adjustment;
		}

	}
#endif

	// Calculate & store spire normal
	if( spire > 0.0f ) {
		vector3 normal(0.0f, step[num_steps-1], spire); // 2d swap
		normal.normalize();
		spire_normal[0] = normal.x;
		spire_normal[1] = normal.y;
		spire_normal[2] = normal.z;
	} else { // Make spire_normal = up vector.
		spire_normal[0] = 0.0f;
		spire_normal[1] = 1.0f;
		spire_normal[2] = 0.0f;
	}

	// Window texture.
	static const unsigned int NUM_WINDOW_TEXTURES = 4;
	static const string window_tex[NUM_WINDOW_TEXTURES] = {
		"win_brick.jpg",
		"win_gray.jpg",
		"win_gray.jpg", // dodgy hack to get this more representation..
		"win_concrete.jpg",
	};

	string dir("data/images/city/");
	tex = Texture_Factory( dir + window_tex[ mt.randInt(NUM_TEX-1) ]);
	gray = 0.8f + 0.2f * (float)mt.rand();
	create_interleaved_array();
}


Skyscraper::~Skyscraper(void)
{
	delete[] step;
	delete tex;
	delete intertwined;
}



enum {
	TEXCOORD_U,
	TEXCOORD_V,
	NORMAL_X,
	NORMAL_Y,
	NORMAL_Z,
	VERTEX_X,
	VERTEX_Y,
	VERTEX_Z
};


void Skyscraper::create_interleaved_array(void)
{

	num_elements = 2 * num_steps + 1;
	unsigned int size = num_elements * 8 * sizeof( GLfloat );
	//	cout << "intertwined size = " << size << endl;
	intertwined = new GLfloat[ size ];

	memset( intertwined, 0, size ); // default to 0.0f

	GLfloat win_mul = 2.0f / window_size;
	GLfloat sum[2];
	GLfloat step_amount[2];
	step_amount[0] = window_size;
	step_amount[1] = -1.0f; // inward

	sum[0] = 0.0f;
	sum[1] = width / 2.0f;
	int s, t=0; // texcoords - INTEGERS for nice windows align

	s = (int)(sum[1] * win_mul);
	unsigned int offset = 0;

	// 2 base points
	intertwined[offset + NORMAL_Z] = 1.0f; // normal points out +Z
	intertwined[offset + VERTEX_X] = -sum[1];
	intertwined[offset + VERTEX_Y] =  sum[0];
	intertwined[offset + VERTEX_Z] =  sum[1];

	offset += 8;
	intertwined[offset + TEXCOORD_U]= (float)s;
	intertwined[offset + NORMAL_Z]	= 1.0f;
	intertwined[offset + VERTEX_X]	= sum[1];
	intertwined[offset + VERTEX_Y]	= sum[0];
	intertwined[offset + VERTEX_Z]	= sum[1];

	for( unsigned int j=0 ; j < num_steps-1 ; j++ ) {
		int axis = j&1;
		sum[axis] += step[j] * step_amount[axis];
		s = (int)(sum[1] * win_mul);
		t += (int)step[j] * (!axis);

		offset += 8;
		intertwined[offset + TEXCOORD_V] = (float)t;
		intertwined[offset + (axis? NORMAL_Y : NORMAL_Z)] = 1.0f;
		intertwined[offset + VERTEX_X] = -sum[1];
		intertwined[offset + VERTEX_Y] =  sum[0];
		intertwined[offset + VERTEX_Z] =  sum[1];

		offset += 8;
		intertwined[offset + TEXCOORD_U] = (float)s;
		intertwined[offset + TEXCOORD_V] = (float)t;
		intertwined[offset + (axis? NORMAL_Y : NORMAL_Z)] = 1.0f;
		intertwined[offset + VERTEX_X] =  sum[1];
		intertwined[offset + VERTEX_Y] =  sum[0];
		intertwined[offset + VERTEX_Z] =  sum[1];
	}

	// Final point in middle of skyscraper roof.
	sum[1] -= step[num_steps-1];
	sum[0] += spire; // push up spire.

	offset += 8;
	intertwined[offset + TEXCOORD_U] = (float)s;
	intertwined[offset + TEXCOORD_V] = (float)t;
	intertwined[offset + NORMAL_X] = spire_normal[0];
	intertwined[offset + NORMAL_Y] = spire_normal[1];
	intertwined[offset + NORMAL_Z] = spire_normal[2];
	intertwined[offset + VERTEX_X] =  (float)sum[1];
	intertwined[offset + VERTEX_Y] =  (float)sum[0];
	intertwined[offset + VERTEX_Z] =  (float)sum[1];

	//	cout << "final element of intertwined was " << offset + VERTEX_Z
	//	     << " that * 4 = " << (offset+VERTEX_Z)*4 << endl;

}

/*

FIXME: This probably doesn't reuse verticies as well as it could by drawing
the sides as strips (each side shares verts with the previous one)
but: make it work.... then make it faster.
*/
void Skyscraper::representation(drawdetails_t& drawdetails)
{
	tex->activate();

	glInterleavedArrays( GL_T2F_N3F_V3F, 0, intertwined );

	for( int side = 0 ; side < 4 ; ++side ) {
		//		if( drawdetails.flags & (1<<side) )
		glDrawArrays( GL_TRIANGLE_STRIP, 0, num_elements );
		glRotatef( -90.0f, 0.0f, 1.0f, 0.0f ); // clockwise
	}
}


