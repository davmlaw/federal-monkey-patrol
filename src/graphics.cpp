#include <stdlib.h>
#include <stdio.h>
#include <vector>
#include <GL/glx.h>
#include <GL/glut.h>

#include "kong.h"
#include "mtxlib.h"
#include "model.h"
#include "box.h"
#include "entity.h"

//#include "digiben.h"
//#include "Md2.h"

//#define DO_FOG

vector3 camera(0.0, 0.0, 0.0), lookat(0.0, 0.0, 0.0), up(0.0, 1.0, 0.0);

int resizeWindow( int width, int height );
void initGL(void);
void drawGL(void);

GLfloat foo = 0.0;

// This stores the desired depth that we want to fog
extern float fog_top;
extern float fog_bottom;

// This is our fog extension function pointer to set a vertice's depth
PFNGLFOGCOORDFEXTPROC glFogCoordfEXT;

bool isExtensionSupported(string ext)
{
    int pos = 0;
    bool supported = false;

    int n = ext.length();

    string extensions ((char *)glGetString(GL_EXTENSIONS));

    while( !supported )
    {
        if ( !extensions.compare(ext,n,pos) )
        {
            return true;
        }
        pos = extensions.find(' ' , pos) + 1;

        if( pos <= 0 )
            return false;
    }
}










void setFogCoord(float height)
{
    // This function takes the depth of the fog, as well as the height
    // of the current vertex.  If the height is greater than the depth, there
    // is no fog applied to it (0), but if it's below the depth, then we
    // calculate the fog value that should be applied to it.  Since the higher
    // the number passed into glFogCoordfEXT() produces more fog, we need to
    // subtract the depth from the height, then negate that value to switch
    // the ratio from 0 to the depth around.  Otherwise it would have more
    // fog on the top of the fog volume than the bottom of it.

    float fogY = 0;

    // Check if the height of this vertex is greater than the depth (needs no fog)
    if(height > fog_top )
        fogY = 0;
    // Otherwise, calculate the fog depth for the current vertex
    else {

        fogY = -(height - fog_top);

    }

    //cout << "fogy = " << fogY << endl;

    // Assign the fog coordinate for this vertex using our extension function pointer
    glFogCoordfEXT(fogY);
}


void drawGL(Entity *player, vector<Entity *> &ground, vector<Entity*> &city, vector<Entity*> &entities)
{


    glColor3f(1.0, 1.0, 1.0);
    glClearColor(0.2, 0.2, 0.8, 1.0);
    glClear( GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT );

/*
    GLfloat red[] = { 1.0, 0.0, 0.0, 1.0 };
    GLfloat pos[4];

    pos[0] = player->pos.x;
    pos[1] = player->pos.y;
    pos[2] = player->pos.z;
    pos[3] = 1.0;

    glLightfv( GL_LIGHT1, GL_DIFFUSE, red );
    glLightfv( GL_LIGHT1, GL_POSITION, pos );
    glEnable( GL_LIGHT1 );
*/

    glLoadIdentity();
    GLfloat lightpos[] = { 0.5, 1, 1, 0 };



    //glTranslatef( 0.0, -1000.0, -2000.0 ); // move away from camera.

    //camera = player->pos;

    float rad = player->yaw * 2 * M_PI / 360; 

#if 1

    camera.y = player->pos.y + 3000;



    camera.x = player->pos.x + 5000 * sin( rad );
    camera.z = player->pos.z + 5000 * -cos( rad );
#else // overhead

    camera.x = player->pos.x;
    camera.z = player->pos.z;
    camera.y = player->pos.y + 5000;

    up.x = player->pos.x + 5000 * sin( rad );
    up.y = 0;
    up.z = player->pos.z + 5000 * -cos( rad );

#endif


    //camera.z += 3000;
    lookat = player->pos;

    matrix44 view = LookAtMatrix44(camera, lookat, up);

    GLfloat matrix[16];
    matrix[0] = view.col[0].x;
    matrix[1] = view.col[0].y;
    matrix[2] = view.col[0].z;
    matrix[3] = view.col[0].w;

    matrix[4] = view.col[1].x;
    matrix[5] = view.col[1].y;
    matrix[6] = view.col[1].z;
    matrix[7] = view.col[1].w;

    matrix[8] = view.col[2].x;
    matrix[9] = view.col[2].y;
    matrix[10]= view.col[2].z;
    matrix[11]= view.col[2].w;

    matrix[12] = view.col[3].x;
    matrix[13] = view.col[3].y;
    matrix[14] = view.col[3].z;
    matrix[15] = view.col[3].w;

    glLoadMatrixf(matrix);

    glLightfv( GL_LIGHT0, GL_POSITION, lightpos );

    // Draw the ground quad.
    //glDisable(GL_DEPTH_TEST);
    glDisable(GL_TEXTURE_2D);

    glColor3f( 0.0, 1.0, 0.0 );
    glBegin(GL_POLYGON);

    int size = 70000;
    glNormal3f( 0.0, 1.0, 0.0 );
    glVertex3f( -size, 0, -size );
    glVertex3f( size, 0, -size );
    glVertex3f( size, 0, size );
    glVertex3f( -size, 0, size );
    glEnd();
    //glEnable(GL_DEPTH_TEST);

    glShadeModel( GL_FLAT );

    glDisable(GL_DEPTH_TEST);

    vector<Entity *>::iterator ent;
    vector<Entity *>::reverse_iterator rent;
    for( rent = ground.rbegin() ; rent != ground.rend() ; rent++ ) {
	(*rent)->draw();
    }

    glEnable(GL_DEPTH_TEST);

    for( ent = city.begin() ; ent != city.end() ; ent++ ) {
	(*ent)->draw();
    }

    glShadeModel( GL_SMOOTH );


    for( ent = entities.begin() ; ent != entities.end() ; ent++ ) {
	(*ent)->draw();
    }


/*
    glPushMatrix();
    glTranslatef( 0.0, 10000, 0.0 );
    glScalef(100.0, 100.0, 100.0 );
    //glutWireTeapot(2000);
    glPopMatrix();
*/

    SDL_GL_SwapBuffers(); // This also calls flush()


}


const GLfloat white[] = { 0.0, 0.0, 1.0, 1.0 };

void initGL(void)
{
    GLfloat lightambient[] = { 0.85, 0.85, 0.85, 1.0 };
    //GLfloat lightambient[] = { 1.0, 1.0, 1.0, 1.0 };
    //GLfloat lightpos[] = { 0.0, 2000.0, 500.0, 1.0 };
    //GLfloat lightdir[] = { 0.0, -1, -1, 1.0 };



    glLightfv( GL_LIGHT0, GL_AMBIENT, lightambient );
//    glLightfv( GL_LIGHT1, GL_DIFFUSE, white );

    /* Position The Light */
    //glLightfv( GL_LIGHT1, GL_POSITION, lightpos );
    //glLightfv( GL_LIGHT1, GL_SPOT_DIRECTION, lightpos );

//    glDisable( GL_LIGHT0 );
    glEnable( GL_LIGHT0 );
//    glEnable( GL_LIGHT1 );
    glEnable( GL_LIGHTING );
    
    /* Blending Function For Translucency Based On Source Alpha Value  */
    glBlendFunc( GL_SRC_ALPHA, GL_ONE );
    glShadeModel( GL_SMOOTH );
    glEnable( GL_TEXTURE_2D );

    glClearColor( 0.0f, 0.0f, 0.0f, 0.0f );

    /* Depth buffer setup */
    glClearDepth( 1.0f );
    glEnable( GL_DEPTH_TEST );
    //glDepthFunc( GL_LEQUAL );

    glCullFace(GL_FRONT);
    glEnable(GL_CULL_FACE);

#ifdef DO_FOG
    GLfloat haze[] = { 0.8, 0.8, 0.8, 1.0 };

    glFogi(GL_FOG_MODE, GL_LINEAR);
    glFogf(GL_FOG_DENSITY, 0.3);
    glFogf(GL_FOG_END, 30000);
    glFogfv(GL_FOG_COLOR, haze);

    if( !isExtensionSupported(string("GL_ARB_FOG_COORD") ) )
    {
        cout << "Error , fogCoord not supported" << endl;
        Quit(1);
    }
 
     // If we have loaded the mulitextures correctly, then we can now test to see
     // if the video card supports hardware accelerated fog.  We do the same things
     // for every extension.  First we tell wglGetProcAddress() which extension
     // we want, which then returns a function pointer.  Afterwards, the function
     // pointer is checked to make sure the current video card drivers or setup
     // support it.
     //
     // Find the correct function pointer that houses the fog coordinate function
    glFogCoordfEXT  =  (PFNGLFOGCOORDFEXTPROC) glXGetProcAddressARB((const GLubyte *)"glFogCoordfEXT");

    // It is assumed that by getting here, we should be able to do volumetric fog
    // with this video card.  Now comes the setup and initialization.  Just like
    // when we create normal fog, we need to turn on GL_FOG, give a fog color,
    // as well as give the start and end distance for the thickness of the fog.
    // The new information that will need to be given will be to glFogi().
    // The new flags we defined tell OpenGL that we want per vertex fog.
    // Notice that we don't use GL_FOG_DENSITY.  It doesn't seem to have any effect.

    glEnable(GL_FOG);                       // Turn on fog
    glFogi(GL_FOG_MODE, GL_LINEAR);         // Set the fog mode to LINEAR (Important)
    glFogfv(GL_FOG_COLOR, haze );
    glFogf(GL_FOG_START, 0.0);              // Set the start position for the depth at 0
    glFogf(GL_FOG_END, 30000.0);               // Set the end position for the detph at 50

    // Now we tell OpenGL that we are using our fog extension for per vertex
    // fog calculations.  For each vertex that needs fog applied to it we must
    // use the glFogCoordfEXT() function with a depth value passed in.
    // These flags are defined in main.h and are not apart of the normal opengl headers.
    glFogi(GL_FOG_COORDINATE_SOURCE_EXT, GL_FOG_COORDINATE_EXT);


#endif //do fog

    //glHint(GL_FOG_HINT, GL_NICEST);



    glHint( GL_PERSPECTIVE_CORRECTION_HINT, GL_NICEST );

//    glHint(GL_POLYGON_SMOOTH_HINT, GL_NICEST);
//    glHint(GL_LINE_SMOOTH_HINT, GL_NICEST);

    //   glEnable(GL_LINE_SMOOTH);
    //glEnable(GL_POLYGON_SMOOTH);


    
}


#define SENSF 33.0
#define MAXPITCH 90.0

struct axis_accel {
    int x; // X Plane
    int y; // Y Plane
    int z; // Z Plane
};

/* function to reset our viewport after a window resize */
int resizeWindow( int width, int height )
{
    /* Height / width ration */
    GLfloat ratio;
 
    /* Protect against a divide by zero */
    if ( height == 0 )
	height = 1;

    ratio = ( GLfloat )width / ( GLfloat )height;

    /* Setup our viewport. */
    glViewport( 0, 0, ( GLint )width, ( GLint )height );

    /* change to the projection matrix and set our viewing volume. */
    glMatrixMode( GL_PROJECTION );
    glLoadIdentity( );

    /* Set our perspective */
    gluPerspective( 45.0f, ratio, 10.0, 200000.0f );

    /* Make sure we're chaning the model view and not the projection */
    glMatrixMode( GL_MODELVIEW );

    /* Reset The View */
    glLoadIdentity( );

    return true;
}











#if 0


void CreateTexture(unsigned int textureArray[],char *strFileName,int textureID)
{
    SDL_Surface *pBitmap[1];

    if( strFileName == NULL )                           // Return from the function if no file name was passed in
        return ;

    // We need to load the texture data, so we use a cool function that SDL offers.
    
    pBitmap[0] = SDL_LoadBMP(strFileName);              // Load the bitmap and store the data

    if(pBitmap[0] == NULL)                                // If we can't load the file, quit!
    {
        cerr << " Failed loading " << strFileName << " : " << SDL_GetError() << endl;
        Quit(0);
    }

    // Generate a texture with the associative texture ID stored in the array
    glGenTextures(1, &md2_texture );

    // Bind the texture to the texture arrays index and init the texture
    glBindTexture(GL_TEXTURE_2D, md2_texture );

    // WARNING   : GO THROUGH THESE FEW LINES FOR SWAPPING ROWS ONLY IF YOU REALLY NEED TO, OR ELSE SKIP
    // THE LINES MARKED BELOW. Just take it for granted that these lines of code swap rows in the texture 
    // as required by us.
    
    // <SKIP> <SKIP> <SKIP> <SKIP>   (FROM HERE)        -------------------
    //
    // IMPORTANT : SDL loads Bitmaps differently when compared to the default windows loader. The row 0
    // corresponds to the top row and NOT the bottom row. Therefore if we don't invert the order of the rows,
    // then the textures will appear (vertically) inverted.
    // Therefore we must reverse the ordering of the rows in the data of the loaded surface ( the member
    //  'pixels' of the structure)
    
    // Rearrange the pixelData 
    
    int width  = pBitmap[0] -> w;
    int height = pBitmap[0] -> h;
    unsigned char * data = (unsigned char *) (pBitmap[0] -> pixels);         // the pixel data

    int BytesPerPixel = pBitmap[0] -> format -> BytesPerPixel;

    //////////// This is how we swap the rows :
    // For half the rows, we swap row 'i' with row 'height - i -1'. (if we swap all the rows
    // like this and not the first half or the last half, then we get the same texture again !
    //
    // Now these rows are not stored as 2D arrays, instead they are stored as a long 1D array.
    // So each row is concatenated after the previous one to make this long array. Our swap 
    // function swaps one byte at a time and therefore we swap BytesPerPixel (= total bits per pixel)
    // bytes succesively.
    //
    // so the three loops below are :
    // for the first half of the rows
    //   for all the width (which is width of image * BytesPerPixel, where BytesPerPixel = total bits per pixel).
    //   (Here, for each pixel, we have to increment j by total bits per pixel (to get to next pixel to swap))
    //      for(each byte in this pixel i.e k = 0 to BytesPerPixel - 1, i.e BytesPerPixel bytes.
    //        swap the byte with the corresponding byte in the 'height -i -1'th row ('i'th row from bottom)
    for( int i = 0 ; i < (height / 2) ; ++i )
        for( int j = 0 ; j < width * BytesPerPixel; j += BytesPerPixel )
            for(int k = 0; k < BytesPerPixel; ++k)
                swap( data[ (i * width * BytesPerPixel) + j + k], data[ ( (height - i - 1) * width * BytesPerPixel ) + j + k]);
    
    unsigned char *pixels = new unsigned char[width * height * 3];

    int count = 0;
    
    // the following lines extract R,G and B values from any bitmap

    for(int i = 0; i < (width * height); ++i)
    {
        byte r,g,b;                                                // R,G and B that we will put into pImage

        Uint32 pixel_value = 0;                                    // 32 bit unsigned int (as dictated by SDL)

        // the following loop extracts the pixel (however wide it is 8,16,24 or 32) and 
        // creates a long with all these bytes taken together.
        
        for(int j = BytesPerPixel - 1 ; j >=0; --j)                // for each byte in the pixel (from the right)
        {
            pixel_value = pixel_value << 8;                        // left shift pixel value by 8 bits
            pixel_value = pixel_value | data[ (i * BytesPerPixel) + j ];  // then make the last 8 bits of pixel value  =
        }                                                                 // the byte that we extract from pBitmap's data

        SDL_GetRGB(pixel_value, pBitmap[0] -> format, (Uint8 *)&r, (Uint8 *)&g, (Uint8 *)&b);     // here we get r,g,b from pixel_value which is stored in the form specified by pBitmap->format

        pixels[count++] = r;          // in our tImage classes we store r first
        pixels[count++] = g;          // then g
        pixels[count++] = b;          // and finally b (for bmps - three channels only)
        /*pixels[(i * BytesPerPixel) + 0] = r;          // in our tImage classes we store r first
        pixels[(i * BytesPerPixel) + 1] = g;          // then g
        pixels[(i * BytesPerPixel) + 2] = b;          // and finally b (for bmps - three channels only)*/

        pixel_value = 0;                                           // reset pixel , else we get incorrect values of r,g,b
    }


    // </SKIP> </SKIP> </SKIP> </SKIP>    (TO HERE)   -------------------
    
    // Build Mipmaps (builds different versions of the picture for distances - looks better)
    gluBuild2DMipmaps(GL_TEXTURE_2D, 3, pBitmap[0]->w, pBitmap[0]->h, GL_RGB, GL_UNSIGNED_BYTE, pixels);

    // Lastly, we need to tell OpenGL the quality of our texture map.  GL_LINEAR is the smoothest.    
    glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_MAG_FILTER,GL_LINEAR);    
    glTexParameteri(GL_TEXTURE_2D,GL_TEXTURE_MIN_FILTER,GL_LINEAR_MIPMAP_LINEAR);//NEAREST);
    glTexEnvf(GL_TEXTURE_ENV, GL_TEXTURE_ENV_MODE, GL_MODULATE);

    // Now we need to free the bitmap data that we loaded since openGL stored it as a texture
    
    SDL_FreeSurface(pBitmap[0]);                        // Free the texture data we dont need it anymore
}







#define FILE_NAME  "tris.md2"                           // This is the 3D file we will load.
#define TEXTURE_NAME "hobgoblin.bmp"

unsigned int g_Texture[MAX_TEXTURES] = {0};                     // This holds the texture info, referenced by an ID

CLoadMD2 g_LoadMd2;                                     // This is MD2 class.  This should go in a good model class.


int   g_ViewMode      = GL_TRIANGLES;                   // We want the default drawing mode to be normal
bool  g_bLighting     = true;                           // Turn lighting on initially
float g_RotateX       = 0.0f;                           // This is the current value at which the model is rotated
float g_RotationSpeed = 0.5f;                           // This is the speed that our model rotates.  (-speed rotates left)

//////////// *** NEW *** ////////// *** NEW *** ///////////// *** NEW *** ////////////////////



///////////////////////////////// INIT GAME WINDOW \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*
/////
/////    This function initializes the game window.
/////
///////////////////////////////// INIT GAME WINDOW \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*

void md2_init()
{

//////////// *** NEW *** ////////// *** NEW *** ///////////// *** NEW *** ////////////////////

    // First we need to actually load the .MD2 file.  We just pass in an address to
    // our t3DModel structure and the file name string we want to load ("tris.md2").
    // We also need to give the texture name we will be using.  This is because there
    // are usually a lot of textures with each character.  You choose the best one.
    // It seems that all of the Quake2 characters .md2 files are called: "tris.md2"

    g_LoadMd2.ImportMD2(&g_3DModel, FILE_NAME, TEXTURE_NAME);       

    // There is no color information for these models, as well as only one
    // texture.  If everything goes well, it should load the TEXTURE_NAME file.

    // Go through all the materials
    for(int i = 0; i < g_3DModel.numOfMaterials; i++)
    {

        // Check to see if there is a file name to load in this material
        if(strlen(g_3DModel.pMaterials[i].strFile) > 0)
        {


            // Use the name of the texture file to load the bitmap, with a texture ID (i).
            // We pass in our global texture array, the name of the texture, and an ID to reference it. 
            cout << "CreateTexture " << endl;
            CreateTexture(g_Texture, g_3DModel.pMaterials[i].strFile, i);           
            cout << g_3DModel.pMaterials[i].strFile << endl;

        }

        // Set the texture ID for this material
        g_3DModel.pMaterials[i].texureId = i;
    }

    //glEnable(GL_COLOR_MATERIAL);                        // Allow color

    /*
    // Here, we turn on a lighting and enable lighting.  We don't need to
    // set anything else for lighting because we will just take the defaults.
    // We also want color, so we turn that on

    float soft[] = { 0.2, 0.2, 0.2, 1.0 };
    float white[] = { 1.0, 1.0, 1.0, 1.0 };

    glLightfv(GL_LIGHT0, GL_AMBIENT, soft);
    glLightfv(GL_LIGHT0, GL_DIFFUSE, white);
    glEnable(GL_LIGHT0);                                // Turn on a light with defaults set
    glEnable(GL_LIGHTING);                              // Turn on lighting


    // To make our model render somewhat faster, we do some front back culling.
    // It seems that Quake2 orders their polygons clock-wise.

    glEnable(GL_CULL_FACE);                             // Turn culling on
    glCullFace(GL_FRONT);                               // Quake2 uses front face culling apparently

    */

//////////// *** NEW *** ////////// *** NEW *** ///////////// *** NEW *** ////////////////////


}

//////////// *** NEW *** ////////// *** NEW *** ///////////// *** NEW *** ////////////////////

///////////////////////////////// RETURN CURRENT TIME \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*
/////
/////   This returns time t for the interpolation between the current and next key frame
/////
///////////////////////////////// RETURN CURRENT TIME \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*

float ReturnCurrentTime(t3DModel *pModel, int nextFrame)
{
    static float elapsedTime   = 0.0f;
    static float lastTime     = 0.0f;

    // This function is very similar to finding the frames per second.
    // Instead of checking when we reach a second, we check if we reach
    // 1 second / our animation speed. (1000 ms / kAnimationSpeed).
    // That's how we know when we need to switch to the next key frame.
    // In the process, we get the t value for how we are at to going to the
    // next animation key frame.  We use time to do the interpolation, that way
    // it runs the same speed on any persons computer, regardless of their specs.
    // It might look chopier on a junky computer, but the key frames still be
    // changing the same time as the other persons, it will just be not as smooth
    // of a transition between each frame.  The more frames per second we get, the
    // smoother the animation will be.

    // Get the current time in milliseconds
    float time = SDL_GetTicks();

    // Find the time that has elapsed since the last time that was stored
    elapsedTime = time - lastTime;

    // To find the current t we divide the elapsed time by the ratio of 1 second / our anim speed.
    // Since we aren't using 1 second as our t = 1, we need to divide the speed by 1000
    // milliseconds to get our new ratio, which is a 5th of a second.
    float t = elapsedTime / (1000.0f / kAnimationSpeed);
    
    // If our elapsed time goes over a 5th of a second, we start over and go to the next key frame
    if (elapsedTime >= (1000.0f / kAnimationSpeed) )
    {
        // Set our current frame to the next key frame (which could be the start of the anim)
        pModel->currentFrame = nextFrame;

        // Set our last time to the current time just like we would when getting our FPS.
        lastTime = time;
    }

    // Return the time t so we can plug this into our interpolation.
    return t;
}


///////////////////////////////// ANIMATE MD2 MODEL \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*
/////
/////   This draws and animates the .md2 model by interpoloated key frame animation
/////
///////////////////////////////// ANIMATE MD2 MODEL \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*

void AnimateMD2Model(t3DModel *pModel)
{
    // Now comes the juice of our tutorial.  Fear not, this is actually very intuitive
    // if you drool over it for a while (stay away from the keyboard though...).
    // What's going on here is, we are getting our current animation that we are
    // on, finding the current frame of that animation that we are on, then interpolating
    // between that frame and the next frame.  To make a smooth constant animation when
    // we get to the end frame, we interpolate between the last frame of the animation 
    // and the first frame of the animation.  That way, if we are doing the running 
    // animation let's say, when the last frame of the running animation is hit, we don't
    // have a huge jerk when going back to the first frame of that animation.  Remember,
    // because we have the texture and face information stored in the first frame of our
    // animation, we need to reference back to this frame every time when drawing the
    // model.  The only thing the other frames store is the vertices, but no information
    // about them.
    
    // Make sure we have valid objects just in case. (size() is in the vector class)
    if(pModel->pObject.size() <= 0) return;

    // Here we grab the current animation that we are on from our model's animation list
    tAnimationInfo *pAnim = &(pModel->pAnimations[pModel->currentAnim]);

    // This gives us the current frame we are on.  We mod the current frame plus
    // 1 by the current animations end frame to make sure the next frame is valid.
    // If the next frame is past our end frame, then we go back to zero.  We check this next.
    int nextFrame = (pModel->currentFrame + 1) % pAnim->endFrame;

    // If the next frame is zero, that means that we need to start the animation over.
    // To do this, we set nextFrame to the starting frame of this animation.
    if(nextFrame == 0) 
        nextFrame =  pAnim->startFrame;

    // Get the current key frame we are on
    t3DObject *pFrame =      &pModel->pObject[pModel->currentFrame];

    // Get the next key frame we are interpolating too
    t3DObject *pNextFrame =  &pModel->pObject[nextFrame];

    // Get the first key frame so we have an address to the texture and face information
    t3DObject *pFirstFrame = &pModel->pObject[0];

    // Next, we want to get the current time that we are interpolating by.  Remember,
    // if t = 0 then we are at the beginning of the animation, where if t = 1 we are at the end.
    // Anyhing from 0 to 1 can be thought of as a percentage from 0 to 100 percent complete.
    float t = ReturnCurrentTime(pModel, nextFrame);


    glBindTexture(GL_TEXTURE_2D, md2_texture);



    // Start rendering lines or triangles, depending on our current rendering mode (Lft Mouse Btn)
    glBegin(g_ViewMode);

        // Go through all of the faces (polygons) of the current frame and draw them
        for(int j = 0; j < pFrame->numOfFaces; j++)
        {
            // Go through each corner of the triangle and draw it.
            for(int whichVertex = 0; whichVertex < 3; whichVertex++)
            {
                // Get the index for each point of the face
                int vertIndex = pFirstFrame->pFaces[j].vertIndex[whichVertex];

                // Get the index for each texture coordinate for this face
                int texIndex  = pFirstFrame->pFaces[j].coordIndex[whichVertex];
                        
                // Make sure there was a UVW map applied to the object.  Notice that
                // we use the first frame to check if we have texture coordinates because
                // none of the other frames hold this information, just the first by design.
                if(pFirstFrame->pTexVerts) 
                {
                    // Pass in the texture coordinate for this vertex
                    glTexCoord2f(pFirstFrame->pTexVerts[ texIndex ].x, 
                                 pFirstFrame->pTexVerts[ texIndex ].y);
                }

                // Now we get to the interpolation part! (*Bites his nails*)
                // Below, we first store the vertex we are working on for the current
                // frame and the frame we are interpolating too.  Next, we use the
                // linear interpolation equation to smoothly transition from one
                // key frame to the next.
                
                // Store the current and next frame's vertex
                CVector3 vPoint1 = pFrame->pVerts[ vertIndex ];
                CVector3 vPoint2 = pNextFrame->pVerts[ vertIndex ];

                // By using the equation: p(t) = p0 + t(p1 - p0), with a time t
                // passed in, we create a new vertex that is closer to the next key frame.
                glVertex3f(vPoint1.x + t * (vPoint2.x - vPoint1.x), // Find the interpolated X
                           vPoint1.y + t * (vPoint2.y - vPoint1.y), // Find the interpolated Y
                           vPoint1.z + t * (vPoint2.z - vPoint1.z));// Find the interpolated Z
            }
        }

    // Stop rendering the triangles
    glEnd();    
}



#endif
