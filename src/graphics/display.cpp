// (C) David Lawrence released under the GPL (see license.txt)
// Started:              2003
// Last modified: 21 Aug 2004

#include "graphics/2d/text2d.h"
#include "graphics/3d/billboards.h"
#include "graphics/3d/quadtree.h"
#include "graphics/3d/collision/frustum.h"
#include "graphics/display.h"
#include "kong.h"
#include "util/settings.h"
#include "util/util.h"
#include <iostream>

static const unsigned int SCREEN_BPP = 32;
static const unsigned int FOV = 90;

static const float NEAR_DIST =    20.0f;
static const float FAR_DIST  = 25000.0f;
static const float FOG_START =    50.0f;
static const float FOG_END   = 11000.0f;

using namespace std;

static void load_mtx_matrix(const matrix44& mtxmatrix);

const float Display::ORTHO_W = 1.0f;
const float Display::ORTHO_H = 0.75f;

Display::Display(void)
{
	initSDL();
	initGL();

	// Toplevel Drawdetails - Default settings for root drawables
	toplevel_drawdetails.offset.x = 0.0f;
	toplevel_drawdetails.offset.y = 0.0f;
	toplevel_drawdetails.offset.z = 0.0f;
	//toplevel_drawdetails.lod = 1.0f;
	toplevel_drawdetails.scale = 1.0f;
	toplevel_drawdetails.flags = NORTH_BIT|EAST_BIT|SOUTH_BIT|WEST_BIT;
	toplevel_drawdetails.frustum = 0;
}


Display::~Display()
{
	SDL_Quit();
}


// Singleton stuff
// NOTE: This is a reference to static variable NOT an allocated
//       pointer because ~Display() MUST to be called for SDL_Quit()
//       however the program may exit in order to reset the system nicely
// FIXME: we need some way to change screen settings...
Display& Display::Instance(void)
{
	static Display _instance;
	return _instance;
}

void Display::draw_context_3d(Camera* camera,
							  Drawable* background, Drawable &foreground )
{
	vector3 position = camera->getPosition();
	vector3 target   = camera->getTarget();
	vector3 up       = camera->getUp();

	matrix44 view_matrix = LookAtMatrix44(position, target, up);
	load_mtx_matrix(view_matrix);

	// Lighting. Try to look like the sun.
	// if w (4th element) is 0 for position, light = directional source.
	GLfloat light_pos[] = { 1.0f, 5.0f, 1.0f, 0.0f };
	glLightfv( GL_LIGHT0, GL_POSITION, light_pos );
	GLfloat light_dir[] = { 1.0f, -1.0f, 0.0f, 1.0f };
	glLightfv( GL_LIGHT0, GL_SPOT_DIRECTION, light_dir );

	// Set Quadtree internal rendering order according to plane's heading.
	vector3 heading = target - position;
	Quadtree::setup_render_front_to_back( heading );

	//Frustum frustum(view_matrix, perspective_matrix);
	toplevel_drawdetails.camera_height = position.y;
	toplevel_drawdetails.frustum = new Frustum(view_matrix,perspective_matrix);
	//toplevel_drawdetails.frustum = &frustum;//new Frustum(

	// background drawn around camera.
	// FIXME: and rotation? easier to do before loading viewmatrix?
	if( background ) {
		background->setPosition( position );
		background->draw( toplevel_drawdetails );
	}

	foreground.draw( toplevel_drawdetails );
	billboards_draw();

	//FIXME: Errors are ignored!
	GLenum error;
	if( (error = glGetError()) ) {
		cout << "GL Error = " << error << endl;
	}

	//cout << "-------- end frame ----------\n";
	delete toplevel_drawdetails.frustum;
}


void Display::draw_context_2d(Drawable2D* ortho, GLfloat alpha)
{
	glPushAttrib(GL_ALL_ATTRIB_BITS);
	glDisable(GL_CULL_FACE);
	glDisable(GL_FOG);
	glDisable(GL_LIGHTING);
	glDisable(GL_TEXTURE_2D);
	glEnable(GL_BLEND);

	// Setup Ortho Projection
	float right  = ORTHO_W/2;
	float left   = -right;
	float top    = ORTHO_H/2;
	float bottom = -top;

	glMatrixMode(GL_PROJECTION);
	glPushMatrix();
	glLoadIdentity();
	glOrtho( left, right, bottom, top, -1.0f, FAR_DIST );
	glMatrixMode(GL_MODELVIEW);

	glPushMatrix();
	glLoadIdentity();
	ortho->draw(alpha);
	glPopMatrix();

	// Return state to default.
	glMatrixMode(GL_PROJECTION);
	glPopMatrix();
	glMatrixMode(GL_MODELVIEW);

	glPopAttrib();
}

void Display::clear(GLbitfield mask)
{
	glClear( mask );
}


void Display::swap_buffers(void)
{
	SDL_GL_SwapBuffers(); // This calls glFlush() for us.
}


// -[06Jun04]- Replaced my TGA screenshot code with BMP code from Cube as bmp
// is (unfortunately) the more common format.
// FIXME: Is this portable across different endians?
void Display::screenshot(string filename)
{
	SDL_Surface *image;
	SDL_Surface *temp;
	if( (image = SDL_CreateRGBSurface(SDL_SWSURFACE, width, height, 24, 0x0000FF, 0x00FF00, 0xFF0000, 0)))
	{
		if( (temp  = SDL_CreateRGBSurface(SDL_SWSURFACE, width, height, 24, 0x0000FF, 0x00FF00, 0xFF0000, 0)))
		{
			glReadPixels(0, 0, width, height, GL_RGB, GL_UNSIGNED_BYTE, image->pixels);
			for (int idx = 0; idx<height; idx++)
			{
				char *dest = (char *)temp->pixels+3*width*idx;
				memcpy(dest, (char *)image->pixels+3*width*(height-1-idx), 3*width);
				endianswap(dest, 3, width);
			};
			filename += ".bmp";
			SDL_SaveBMP(temp, filename.c_str());
			SDL_FreeSurface(temp);
		};
		SDL_FreeSurface(image);
	}
}


void Display::initSDL(void)
{
	string message; // used for errors.
	int val = SDL_Init(SDL_INIT_VIDEO | SDL_INIT_JOYSTICK);
	if( val < 0 ) {
		message = "Initialising SDL: ";
		message += SDL_GetError();
		ERR_QUIT(message, val);
	}

	const SDL_VideoInfo *videoInfo = SDL_GetVideoInfo();
	if( !videoInfo ) {
		message = "Retrieving Video Info: ";
		message += SDL_GetError();
		ERR_QUIT(message, 1);
	}

	// Video Settings
	SDL_GL_SetAttribute( SDL_GL_DOUBLEBUFFER, 1 );
	SDL_WM_SetCaption(PROGRAMNAME, 0);
	SDL_ShowCursor(0);

	int videoFlags = 0;
	videoFlags |= SDL_OPENGL;
	videoFlags |= SDL_HWPALETTE;

	if ( videoInfo->hw_available )
		videoFlags |= SDL_HWSURFACE;
	else
		videoFlags |= SDL_SWSURFACE;

	if( videoInfo->blit_hw )
		videoFlags |= SDL_HWACCEL;

	extern Settings settings;
	const Properties<Scalar>* prop = settings.get("display");
	width  = (int)prop->get("width");
	height = (int)prop->get("height");
	if( (int)prop->get("fullscreen") )
		videoFlags |= SDL_FULLSCREEN;

	surface = SDL_SetVideoMode( width, height, bpp, videoFlags);
	if ( !surface ) {
		message = "Setting Video Mode: ";
		message += SDL_GetError();
		ERR_QUIT(message, 1);
	}


}


// Setup defaults which will be assumed by other code
// if you change something somewhere else... PUT IT BACK!
void Display::initGL(void)
{
	// Setup perspective
	glMatrixMode(GL_PROJECTION);
	GLfloat aspect_ratio = (GLfloat)width/(GLfloat)height;
	fov = FOV / 2;

	perspective_matrix = PerspectiveMatrix44( (float)fov, aspect_ratio,
											  NEAR_DIST, FAR_DIST );
	load_mtx_matrix(perspective_matrix);
	glMatrixMode(GL_MODELVIEW);

	glShadeModel( GL_FLAT ); // default as buildings are flat.
	glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
	glHint( GL_PERSPECTIVE_CORRECTION_HINT, GL_NICEST );
	glColorMaterial ( GL_FRONT_AND_BACK, GL_AMBIENT_AND_DIFFUSE ) ;
	glEnable(GL_COLOR_MATERIAL); // Material uses glColor() settings
	glEnable( GL_TEXTURE_2D );
	glEnable(GL_NORMALIZE);	// This doesn't seem to drop FPS & is useful.
	glEnable(GL_CULL_FACE);

	// Lighting (by default turned off)
	GLfloat ambient[] = { 0.3f, 0.3f, 0.4f, 1.0f }; // slightly blue
	GLfloat diffuse[] = { 1.0f, 1.0f, 0.8f, 1.0f }; // slightly yellow
	//GLfloat specular[] = { 1.0f, 1.0f, 1.0f, 1.0f };
	glLightfv( GL_LIGHT0, GL_AMBIENT, ambient );
	glLightfv( GL_LIGHT0, GL_DIFFUSE, diffuse );
	//glLightfv( GL_LIGHT0, GL_SPECULAR, specular );
	glEnable( GL_LIGHT0 );

	// FOG (by default turned off)
	glFogi(GL_FOG_MODE, GL_LINEAR);
	glHint(GL_FOG_HINT, GL_NICEST);
	glFogf(GL_FOG_START, FOG_START);
	glFogf(GL_FOG_END, FOG_END );// * 1.5f);
	GLfloat fog_color[] = { 0.8f, 0.8f, 0.8f, 1.0f };
	glFogfv(GL_FOG_COLOR, fog_color);
}



///////////// Helper functions


// read hex values from a string into col, returning number of hex vals
int hexcolor(GLfloat* col, string hex)
{
	int r,g,b,a;
	int num = sscanf(hex.c_str(),"%2x%2x%2x%2x",&r, &g, &b, &a);
	if( num >= 3 ) {
		col[0] = r / 256.0f;
		col[1] = g / 256.0f;
		col[2] = b / 256.0f;
		if( num >= 4 ) {
			col[3] = a / 256.0f;
		} else {
			col[3] = 1.0f;
		}
	}
	return num;
}

// FIXME: Ok, this is trouble - MTX and OpenGL have different internal
//        matrix representations which require element by element conversion.
//        Profiling says this isn't such a big deal, but possibly changing
//        MTXLIB to GL matrices would get rid of ugly conversion code.

// loads MTX 4x4 matrix to top of OpenGL matrix stack
void load_mtx_matrix(const matrix44& mtxmatrix)
{
	GLfloat glmatrix[16];
	convert_mtx_to_glmatrix(mtxmatrix, glmatrix);
	glLoadMatrixf(glmatrix);
}


// Thanks to slickworm for conversion code...
void convert_mtx_to_glmatrix(const matrix44& mtxmatrix, GLfloat *glmatrix)
{

	glmatrix[0] = mtxmatrix.col[0].x;
	glmatrix[1] = mtxmatrix.col[0].y;
	glmatrix[2] = mtxmatrix.col[0].z;
	glmatrix[3] = mtxmatrix.col[0].w;

	glmatrix[4] = mtxmatrix.col[1].x;
	glmatrix[5] = mtxmatrix.col[1].y;
	glmatrix[6] = mtxmatrix.col[1].z;
	glmatrix[7] = mtxmatrix.col[1].w;

	glmatrix[8] = mtxmatrix.col[2].x;
	glmatrix[9] = mtxmatrix.col[2].y;
	glmatrix[10]= mtxmatrix.col[2].z;
	glmatrix[11]= mtxmatrix.col[2].w;

	glmatrix[12] = mtxmatrix.col[3].x;
	glmatrix[13] = mtxmatrix.col[3].y;
	glmatrix[14] = mtxmatrix.col[3].z;
	glmatrix[15] = mtxmatrix.col[3].w;

}

vector3 matrix_to_eulers(const matrix44& m)
{
	vector3 rotation;

	rotation.x = RadToDeg( asin( m[1][2] ) );
	rotation.y = RadToDeg( atan2( -m[0][2], m[2][2] ) );

	if( nearlyequals( 0.0f, cos(DegToRad(rotation.x) )) )
		rotation.z = RadToDeg( atan2( m[0][1], m[0][0] ) );
	else
		rotation.z = RadToDeg( atan2( -m[1][0], m[1][1] ) );

	return rotation;
}


// slow!
matrix44 eulers_to_matrix(const vector3& rotation)
{
	matrix44 rot;
	rot  = RotateRadMatrix44('z', DegToRad(rotation.z));
	rot *= RotateRadMatrix44('x', DegToRad(rotation.x));
	rot *= RotateRadMatrix44('y', DegToRad(rotation.y));
	return rot;
}
