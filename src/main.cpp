#include <stdlib.h>
#include <stdio.h>
#include <vector>
#include <stdint.h>
#include <ode/ode.h>
#include <GL/glut.h>

#include "kong.h"
#include "mtxlib.h"
#include "model.h"
#include "box.h"
#include "skyscraper.h"
#include "street.h"
#include "graphics.h"
#include "entity.h"

#if 1
#define SCREEN_W 1024
#define SCREEN_H 768
#else
#define SCREEN_W 640
#define SCREEN_H 480
#endif
#define SCREEN_BPP 32

// ODE
#define DENSITY 5.0
#define GPB 3

static dWorldID world;
static dSpaceID space;
static dJointGroupID contactgroup;

float yaw = 0.0;
float pitch = 0.0;
float roll = 0.0;
float sensitivity = 5.0; // ?
float vel[3] = {0.0, 0.0, 0.0};

SDL_Surface *surface;
vector<Entity *>entities;
vector<Entity *>city;
vector<Entity *>ground;

// This stores the desired depth that we want to fog
float fog_top  = 100.0f;
float fog_bottom = 300.0f;

void handleKeyPress( SDL_keysym *keysym );
void handleMouseMove(int dx, int dy);

void ode_init(void);
static void nearCallback (void *data, dGeomID o1, dGeomID o2);
static void simLoop (int stepsize);


GLfloat kongpos[3] = { 0.0, 0.0, 0.0 };


void building(GLfloat x, GLfloat z,
	      GLfloat x_span, GLfloat z_span,
	      GLfloat height)
{

    if( height > kongpos[1] ) {
	kongpos[0] = x;
	kongpos[1] = height;
	kongpos[2] = z;
    }

    x_span -= 80;
    z_span -= 80;

    Entity *ent = new Entity();
    ent->pos.x = x;
    ent->pos.z = z;
    ent->pos.y = 0.0;
    Skyscraper *b = Skyscraper_Factory(x_span, height, z_span );
    ent->setDrawable(b);
    city.push_back(ent);


}



#define C_LEFT  1
#define C_RIGHT 2
#define C_TOP   4
#define C_BOT   8

#define MIN_BUILDING_WIDTH 1000

#if 0

void city_block(GLfloat x, GLfloat z,
		GLfloat x_span, GLfloat z_span,
		GLfloat height,
		int curb = 15)
{


    GLfloat midx = x + x_span/2.0;
    GLfloat midz = z + z_span/2.0;

    GLfloat len;

    printf("Block (%f,%f)\n", x_span, z_span);

    if( x_span >= 2*MIN_BUILDING_WIDTH && z_span >= 2*MIN_BUILDING_WIDTH ) {


	if( curb & C_TOP || curb & C_BOT ) { // split Left/Right

	    len = MIN_BUILDING_WIDTH + drand48() * (x_span-2*MIN_BUILDING_WIDTH);

	    printf("LEFT = %f%%, RIGHT = %f%%\n", 100*len/x_span, 100*(x_span-len)/x_span);

	    city_block(x,z, len, z_span, height, curb & ~C_RIGHT);

	    city_block(x+len,z, x_span-len, z_span, height, curb & ~C_LEFT);

	} else if( curb & C_LEFT || curb & C_RIGHT ) { // split Up/Down

	    len = MIN_BUILDING_WIDTH + drand48() * (z_span-2*MIN_BUILDING_WIDTH);

	    city_block(x,z, x_span, len, height, curb & ~C_BOT);

	    city_block(x,z+len, x_span, z_span-len, height, curb & ~C_TOP);

	}

    } else { // Building
	height += drand48() * 2000 - 1000;
	building(midx, midz, x_span, z_span, height );
    }
    



}


#endif

/*

     TURN ON

	keypress |= bit;

     TURN OFF

	keypress &= ~bit;

*/


int depth = 0;

void city_block(GLfloat x, GLfloat z,
		GLfloat x_span, GLfloat z_span,
		GLfloat height,
		int curb = 15)
{

    GLfloat midx = x + x_span/2;
    GLfloat midz = z + z_span/2;

//    printf("---------------\n");
//    printf(" DEPTH = %d\n", depth);
    //   printf("City BLOCK: x=%f, z=%f, x_span=%f, z_span=%f\n -- Curb=%d\n",
//	   x, z, x_span, z_span, curb);


    if( x_span < 2*MIN_BUILDING_WIDTH || z_span < 2*MIN_BUILDING_WIDTH ) {
	//GLfloat height = 500 + drand48() * 2500.0;
//	printf("Height WAS %f\n", height);
	height += drand48() * 2000 - 1000;
//	printf("Height = %f\n", height);
	building(midx, midz, x_span, z_span, height );
	printf("********************* DONE *************\n");
	return;
    }
    
    GLfloat len;

    if( x_span > z_span ) {

	if( curb & C_TOP || curb & C_BOT ) {

	    if( x_span - MIN_BUILDING_WIDTH < MIN_BUILDING_WIDTH )
		printf("x_span = %f, z_span = %f\n", x_span, z_span);


	    len = MIN_BUILDING_WIDTH + drand48() * (x_span-2*MIN_BUILDING_WIDTH);
//	    printf("HORIZONTAL: Len = %f. Remainder = %f\n", len, x_span-len);
	    
	    // LEFT.
//	    printf("            LEFT\n");
	    city_block(x,z, len, z_span, height, curb & ~C_RIGHT);

	    // RIGHT
//	    printf("            RIGHT\n");
	    city_block(x+len,z, x_span-len, z_span, height, curb & ~C_LEFT);

	} else if( curb & C_LEFT || curb & C_RIGHT ) {
	    
	    len = MIN_BUILDING_WIDTH + drand48() * (z_span-2*MIN_BUILDING_WIDTH);
//	    printf("VERTICLE: Len = %f. Remainder = %f\n", len, z_span-len);
//	    printf("            TOP\n");
	    city_block(x,z, x_span, len, height, curb & ~C_BOT);
//	    printf("            BOTTOM\n");
	    city_block(x,z+len, x_span, z_span-len, height, curb & ~C_TOP);
	    
	} else {

	    printf("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n");
	    /*
	    GLfloat height = 500 + drand48() * 2500.0;
	    printf("Height = %f\n", height);
	    building(midx, midz, x_span, z_span, height );
	    */
	}


    } else {


	if( curb & C_LEFT || curb & C_RIGHT ) {
	    
	    len = MIN_BUILDING_WIDTH + drand48() * (z_span-2*MIN_BUILDING_WIDTH);
//	    printf("VERTICLE: Len = %f. Remainder = %f\n", len, z_span-len);
	    printf("            TOP\n");
	    city_block(x,z, x_span, len, height, curb & ~C_BOT);
//	    printf("            BOTTOM\n");
	    city_block(x,z+len, x_span, z_span-len, height, curb & ~C_TOP);
	    
	} else if( curb & C_TOP || curb & C_BOT ) {
	    len = MIN_BUILDING_WIDTH + drand48() * (x_span-2*MIN_BUILDING_WIDTH);
//	    printf("HORIZONTAL: Len = %f. Remainder = %f\n", len, x_span-len);
	    
	    // LEFT.
//	    printf("            LEFT\n");
	    city_block(x,z, len, z_span, height, curb & ~C_RIGHT);

	    // RIGHT
//	    printf("            RIGHT\n");
	    city_block(x+len,z, x_span-len, z_span, height, curb & ~C_LEFT);
	} else {

	    printf("!!!!!!!!!!!!!!!!!!!!!\n");
	    /*
	    GLfloat height = 500 + drand48() * 2500.0;
	    printf("Height = %f\n", height);
	    building(midx, midz, x_span, z_span, height );
	    */
	}

    }

}

void wazoo(void);


int main(int argc, char *argv[])
{

    srand48( time(NULL) );

    if ( SDL_Init( SDL_INIT_VIDEO ) < 0 ) {
	printf("Error initialising SDL\n");
	exit(1);
    }

    const SDL_VideoInfo *videoInfo;
    videoInfo = SDL_GetVideoInfo();

    if( videoInfo == NULL ) {
	printf("Error retrieving Video Info\n");
	exit(1);
    }

    /* the flags to pass to SDL_SetVideoMode */
    int videoFlags  = SDL_OPENGL;          /* Enable OpenGL in SDL */
    videoFlags |= SDL_GL_DOUBLEBUFFER; /* Enable double buffering */
    videoFlags |= SDL_HWPALETTE;       /* Store the palette in hardware */
    //videoFlags |= SDL_RESIZABLE;       /* Enable window resizing */

    /* This checks to see if surfaces can be stored in memory */
    if ( videoInfo->hw_available )
	videoFlags |= SDL_HWSURFACE;
    else
	videoFlags |= SDL_SWSURFACE;

    /* This checks if hardware blits can be done */
    if ( videoInfo->blit_hw )
	videoFlags |= SDL_HWACCEL;

    /* Sets up OpenGL double buffering */
    SDL_GL_SetAttribute( SDL_GL_DOUBLEBUFFER, 1 );

    /* get a SDL surface */
    surface = SDL_SetVideoMode( SCREEN_W, SCREEN_H,
					     SCREEN_BPP, videoFlags );
    /* Verify there is a surface */
    if ( !surface ) {
	printf("Video mode set failed: %s\n", SDL_GetError( ) );
	Quit( 1 );
    }

    // Setup some other things......
    SDL_WM_SetCaption("Kong Prototype", NULL);
    SDL_WM_GrabInput(SDL_GRAB_ON);
    SDL_ShowCursor(0);

    /* initialize OpenGL */
    initGL( );
    resizeWindow( SCREEN_W, SCREEN_H );

    Entity *player;

    ode_init();

    Model *monkey_model;

    wazoo();

    try {

	Entity *ent;
	Street *s;

	Model *mdl = Model_Factory("data/monkeypatrol.obj", "data/shite_texture.bmp");
	//mdl->setTexture("data/shite_texture.bmp");
	mdl->set_spin_group(3);

	GLfloat max;
	max = MAX(mdl->max_x, MAX(mdl->max_y, mdl->max_z));
	GLfloat sides[3];
	sides[0] = mdl->max_x + fabs(mdl->min_x);
	sides[1] = mdl->max_y + fabs(mdl->min_y);
	sides[2] = mdl->max_z + fabs(mdl->min_z);

	//printf("Sides = (%f, %f, %f)\n", sides[0], sides[1], sides[2]);

	player = new Entity();

	//*
	player->body = dBodyCreate(world);
	dBodySetPosition( player->body, 0.0, 0.0, 1000);

	dMatrix3 R;
	dRFromAxisAndAngle (R, 0, 0, 0, 0);
	dBodySetRotation (player->body,R);

	dMass m;
	dMassSetBox(&m, DENSITY, sides[0], sides[1], sides[2]);
	player->geom = dCreateBox( space, sides[0], sides[1], sides[2]);
	dGeomSetBody(player->geom, player->body);

	dBodySetMass( player->body, &m );
	//*/

	player->pos.x = 0.0;
	player->pos.y = 4000.0;
	player->pos.z = 50000.0;
	player->setDrawable(mdl);
	entities.push_back(player);

#define BLOCK_WIDTH 5000
#define SPACING 4000.0
#define STREET_WIDTH 2000.0

#define NUM_BOXEN 30

#define ROWS 15
#define COLS 10


	GLfloat x,z;

	for( int i=0 ; i<ROWS ; i++ ) {
	    x = i*(BLOCK_WIDTH+STREET_WIDTH) - (ROWS*BLOCK_WIDTH)/2;

	    for( int j=0 ; j<COLS ; j++ ) {
		z = j*(BLOCK_WIDTH+STREET_WIDTH)
		    - (COLS*(STREET_WIDTH+BLOCK_WIDTH))/2;
		city_block(x, z, BLOCK_WIDTH, BLOCK_WIDTH, 4000 + drand48()*5000 );

		ent = new Entity();
		ent->pos.x = STREET_WIDTH; // + (STREET_WIDTH/2);//+BLOCK_WIDTH)/2;
		ent->pos.z = z - (STREET_WIDTH)/2;
		ent->yaw = 90;
		s = Street_Factory( STREET_WIDTH,
				    (BLOCK_WIDTH+STREET_WIDTH)*ROWS);
		ent->setDrawable(s);
		ground.push_back(ent);


	    }
	}


#define KONGSIZE 2500

	Entity *monkey = new Entity();
	monkey->pos.x = kongpos[0];
	monkey->pos.y = kongpos[1] + KONGSIZE/2;	
	monkey->pos.z = kongpos[2];	
/*
	monkey->pos.x = -SPACING/2;
	monkey->pos.z = -200;
	monkey->pos.y = 0;
*/
	monkey->yaw = -90;
	mdl = Model_Factory("data/kong2.obj", "data/kongcolor.bmp");
	//mdl->setTexture("data/hairy.bmp");
	GLfloat monkey_height = mdl->max_y + fabs(mdl->min_y);
	//printf("monkey height = %f\n", monkey_height);
	mdl->scale = KONGSIZE / monkey_height;

	monkey_model = mdl;

	//monkey->pos.y += KONGSIZE/2;
	monkey->setDrawable(mdl);
	entities.push_back(monkey);

/*
	Entity *monkey;
	monkey = new Entity();
	*monkey = *ent;
	monkey->pos.x -= SPACING;
	entities.push_back(monkey);
*/




	

#if 0

	for( int i=0 ; i<ROWS ; i++ ) {

	    ent = new Entity();
	    ent->pos.x = i * SPACING - (ROWS/2*SPACING);
	    ent->pos.x += SPACING/2;
	    ent->pos.z = (-SPACING * NUM_BOXEN)/2.0 + SPACING/2;
	    s = Street_Factory( 500, SPACING * ROWS);
	    ent->setDrawable(s);
	    ground.push_back(ent);


	    for( int j=0 ; j<NUM_BOXEN ; j++ ) {

		
		GLfloat height = 500 + drand48() * 2500.0;

		building( i*SPACING - (ROWS/2*SPACING), -SPACING * j,
			  500 + drand48() * 400, 500 + drand48() * 400,
			  height );



		/*
		ent->body = dBodyCreate(world);
		dBodySetPosition( ent->body, 0.0, 500, 1000);
		dMassSetBox(&m, DENSITY, 500, height, 500);
		ent->geom = dCreateBox( space, 500, height, 500);
		dBodySetMass( ent->body, &m );
		*/
		/*
		monkey = new Entity();
		monkey->yaw = rand()%360;
		monkey->pos = ent->pos;
		monkey->pos.x += rand()%250;
		monkey->pos.z += rand()%250;
		monkey->pos.y = height + 250;
		monkey->setDrawable(mdl);
		entities.push_back(monkey);
		*/
	    }
	}


	for( int i=0 ; i<ROWS ; i++ ) {
	    ent = new Entity();
	    ent->pos.z = -i * SPACING;
	    ent->pos.z += SPACING/2;
	    ent->pos.x = 0;
	    ent->yaw = 90;
	    s = Street_Factory( 500, SPACING * ROWS);
	    ent->setDrawable(s);
	    ground.push_back(ent);
	}

#endif

    }
    catch (std::string msg) {
	std::cout << "MAIN.CPP: " << msg << endl;
    }

    bool done = false;
    bool isActive = true;
    SDL_Event event;

    GLint T0 = 0;
    GLint Frames = 0;

    GLint last = 2147483647;//INT32_MAX;

    const dReal *pos;

    pitch = 0.0;

    while( !done ) {

	//monkey_model->scale += 0.001;

	pos = dGeomGetPosition( player->geom );
	
	//printf("Plane position = (%f, %f, %f)\n", pos[0], pos[2], pos[1]);

	// Get time passed
	Frames++;

	GLint now = SDL_GetTicks();

	if( now > last ) {
	    simLoop(now-last);
	}
	last = now;
	
	if (now - T0 >= 5000) {
	    GLfloat seconds = (now - T0) / 1000.0;
	    GLfloat fps = Frames / seconds;
	    printf("%d frames in %g seconds = %g FPS\n", Frames, seconds, fps);
	    T0 = now;
	    Frames = 0;
	}


	float rad = player->yaw * 2 * M_PI / 360; 

	player->pos.x += vel[2] * sin( rad );
	player->pos.z += vel[2] * -cos( rad );	

	//printf("pitch = %f\n", pitch);
	// Update Physics model with time.....
	//player->pos.x += vel[0];
	player->pos.y += vel[1];
	//player->pos.z += vel[2];
	player->pitch = pitch;
	player->yaw = yaw;
	player->roll = roll;

	drawGL(player, ground, city, entities); // Draw everything.

	while ( SDL_PollEvent(&event) ) {
	    switch( event.type ) {
	    case SDL_ACTIVEEVENT:
		isActive = event.active.gain;
		break;
	    case SDL_VIDEORESIZE:
		surface = SDL_SetVideoMode( event.resize.w,
					    event.resize.h,
					    16, videoFlags );
		if ( !surface )
		{
		    printf("Could not get a surface after resize: %s\n",
			   SDL_GetError( ) );
		    Quit(1);
		}
		resizeWindow( event.resize.w, event.resize.h );
		break;
	    case SDL_KEYDOWN:
		handleKeyPress( &event.key.keysym );
		break;

	    case SDL_MOUSEMOTION:
		handleMouseMove(event.motion.xrel, event.motion.yrel);
		break;

	    case SDL_QUIT:
		done = true;
		break;
	    default:
		break;
	    }
	}
	
    }





    /* clean ourselves up and exit */
    Quit( 0 );

    /* Should never get here */
    return( 0 );

}


#define SENSF 33.0
#define MAXPITCH 90.0
void handleMouseMove(int dx, int dy)
{

    yaw += (dx/SENSF)*sensitivity;
    pitch -= (dy/SENSF)*sensitivity;

    if( pitch > MAXPITCH)
	pitch = MAXPITCH;
    if( pitch < -MAXPITCH)
	pitch = -MAXPITCH;


}



void handleKeyPress( SDL_keysym *keysym )
{
    switch ( keysym->sym )
	{
	case SDLK_ESCAPE:
	    /* ESC key was pressed */
	    Quit( 0 );
	    break;
	case SDLK_F1:
	    /* 'f' key was pressed
	     * this toggles fullscreen mode
	     */
	    
	    SDL_WM_ToggleFullScreen( surface );
	    break;

	    // Move the player......

	case SDLK_UP:
	    vel[1] += 2.0;
	    break;
	case SDLK_DOWN:
	    vel[1] -= 2.0;
	    break;

	case SDLK_e:
	    vel[2] -= 60.0;
	    break;

	case SDLK_d:

	    vel[2] += 60.0;
	    //if( velocity < 0 )
	    //velocity = 0.0;
	    break;

	case SDLK_s:
	case SDLK_LEFT:
	    roll -= 5.0;
	    break;

	case SDLK_f:
	case SDLK_RIGHT:
	    roll += 5.0;
	    break;

	default:
	    break;
	}

    return;
}


void Quit( int returnCode )
{
    vector<Entity *>::iterator ent;

    for( ent = entities.begin() ; ent != entities.end() ; ent++ ) {
	delete (*ent);
    }
    entities.clear();

    dJointGroupDestroy (contactgroup);
    dSpaceDestroy (space);
    dWorldDestroy (world);

    /* clean up the window */
    SDL_Quit( );

    /* and exit appropriately */
    exit( returnCode );
}





void ode_init(void)
{

  world = dWorldCreate();
  space = dHashSpaceCreate();
  contactgroup = dJointGroupCreate (0);
  dWorldSetGravity (world,0,0,-0.5);
  dWorldSetCFM (world,1e-5);
  dCreatePlane (space,0,0,1,0);

}


static void nearCallback (void *data, dGeomID o1, dGeomID o2)
{

    //printf("NEAR CALLBACK!\n");
    //fflush(NULL);

  int i;
  // if (o1->body && o2->body) return;

  // exit without doing anything if the two bodies are connected by a joint
  dBodyID b1 = dGeomGetBody(o1);
  dBodyID b2 = dGeomGetBody(o2);
  if (b1 && b2 && dAreConnected (b1,b2)) {
      printf("Already connected\n");
      return;
  }


#define COL 5
  dContact contact[COL];			// up to 3 contacts per box
  for (i=0; i<COL; i++) {
    contact[i].surface.mode = dContactBounce; //dContactMu2;
    contact[i].surface.mu = dInfinity;
    contact[i].surface.mu2 = 0;
    contact[i].surface.bounce = 0.5;
    contact[i].surface.bounce_vel = 0.1;
  }
  if (int numc = dCollide (o1,o2,COL,&contact[0].geom,sizeof(dContact))) {
      
      //printf("Ok, so we have a collision\n");
      dVector3 result;
      dGeomBoxGetLengths (o1, result);
      //printf("dimensions = (%f,%f,%f)\n", result[0], result[2], result[1]);


      //dMatrix3 RI;
      //dRSetIdentity (RI);
      //const dReal ss[3] = {0.02,0.02,0.02};
      for (i=0; i<numc; i++) {
	  dJointID c = dJointCreateContact (world,contactgroup,contact+i);
	  dJointAttach (c,b1,b2);
	  
	  glPushMatrix();
	  glTranslatef(contact[i].geom.pos[0],
		       contact[i].geom.pos[1],
		       contact[i].geom.pos[2]);
	  glColor3f(0.0, 0.0, 1.0);
	  glutWireSphere(2000, 10, 10);
	  glPopMatrix();

	  /*
	  printf("Contact point = (%f,%f,%f)\n",
		 contact[i].geom.pos[0],
		 contact[i].geom.pos[1],
		 contact[i].geom.pos[2]);
	  */
	  
	  //dsDrawBox (contact[i].geom.pos[3],RI,ss);
      }
  }
}


// simulation loop

static void simLoop (int stepsize)
{

    //printf("Simloop stepside = %d\n", stepsize);

    //dsSetColor (0,0,2);
    dSpaceCollide (space,0,&nearCallback);
    //if (!stepsize)
    dWorldStep (world, 0.5);
    
    // remove all contact joints
    dJointGroupEmpty (contactgroup);

}
