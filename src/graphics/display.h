// (C) 2003 David Lawrence released under the GPL (see license.txt)
// Started:       16 Mar 2004

#ifndef DISPLAY_H
#define DISPLAY_H

#include "sdl_opengl.h"
#include "graphics/2d/drawable2d.h"
#include "graphics/3d/drawable.h"
#include "graphics/camera/camera.h"
#include "util/mtxlib.h"

class Camera;

/**
 * All graphics operations start here.
 */
class Display {
public:
    ~Display();
	/// Draws a 3d object
    void draw_context_3d(Camera* camera,
			 Drawable* background, Drawable& foreground);
	/// Draws a 2d object
	void draw_context_2d(Drawable2D* ortho, GLfloat alpha=1.0f);
    void clear(GLbitfield mask = GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    void swap_buffers(void);
    void screenshot(std::string filename);
    static Display& Instance(void);
    static const float ORTHO_W;
    static const float ORTHO_H;
protected:
    Display(void);
private:
    void initSDL(void);
    void initGL(void);
    int width;
    int height;
    int bpp;
    int fullscreen;
    unsigned int fov;
    drawdetails_t toplevel_drawdetails;
    SDL_Surface *surface;
    matrix44 perspective_matrix;
};

int hexcolor(GLfloat* col, std::string hex);
// client must allocate and take care of own memory allocation for glmatrix.
void convert_mtx_to_glmatrix(const matrix44& mtxmatrix, GLfloat *glmatrix);

matrix44 eulers_to_matrix(const vector3& rotation);
vector3 matrix_to_eulers(const matrix44& m);

#endif
