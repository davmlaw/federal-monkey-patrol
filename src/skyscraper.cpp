#include <stdio.h>
#include <string.h>
#include <math.h>

#include "kong.h"
#include "skyscraper.h"
#include "graphics.h"

//#define DO_FOG



GLuint tex[3];

char *texname[3] = {
    "data/skyscraper_skin3.bmp",
    "data/skyscraper_newskin2.bmp",
    "data/skyscraper_newskin.bmp"
};

extern float g_FogDepth;

void wazoo(void)
{

    SDL_Surface *TextureImage; 

    /* Create The Texture */
    glGenTextures( 3, tex );

    for( int i=0 ; i<3 ; i++ ) {

	/* Load The Bitmap, Check For Errors, If Bitmap's Not Found Quit */
	if ( ( TextureImage = SDL_LoadBMP( texname[i] ) ) ) {

	    /* Load in texture 3 */
	    /* Typical Texture Generation Using Data From The Bitmap */
	    glBindTexture( GL_TEXTURE_2D, tex[i] );

	    /* Mipmapped Filtering */
	    glTexParameteri( GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER,
			     GL_LINEAR_MIPMAP_NEAREST );
	    glTexParameteri( GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER,
			     GL_LINEAR );

	    /* Generate The MipMapped Texture  */
	    gluBuild2DMipmaps( GL_TEXTURE_2D, GL_RGB, TextureImage->w,
			       TextureImage->h, GL_BGR,
			       GL_UNSIGNED_BYTE, TextureImage->pixels );

	    cout << "Setting texture to: " << texname[i] << endl;
	    SDL_FreeSurface( TextureImage );
	} else {
	    std::string str("Unable to loat texture \"");
	    str += texname[i];
	    str += "\"\n";
	    throw str;
	}


    }

}


Skyscraper *Skyscraper_Factory(GLfloat x_span, GLfloat y_span, GLfloat z_span)
{
    Skyscraper *millhouse = NULL;

    millhouse = new Skyscraper();

    millhouse->load(x_span, y_span, z_span);
    //millhouse->setTexture("data/skyscraper_multi.bmp");


    millhouse->setTexture( tex[rand()%3] );

#if 0
    switch( rand()%3 ) {
    case 0:
	//millhouse->setTexture("data/skyscraper_skin3.bmp");	
	millhouse->setTexture(tex1);
	break;
    case 1:
	//millhouse->setTexture("data/skyscraper_newskin2.bmp");	
	millhouse->setTexture(tex2);
	break;
    default:
	//millhouse->setTexture("data/skyscraper_newskin.bmp");
	millhouse->setTexture(tex3);
	break;
    }
//#else
    //millhouse->setTexture("data/skyscraper_skin_arrow.bmp");
    millhouse->setTexture("data/skyscraper_newskin.bmp");
#endif

    millhouse->process();

    return millhouse;

}

#define IMG_SIZE 512

void Skyscraper::load(GLfloat x, GLfloat y, GLfloat z)
{

    int x_windows = x / IMG_SIZE;
    int y_windows = y / IMG_SIZE;
    int z_windows = z / IMG_SIZE;

    printf("Dimensions = (%f,%f,%f)\n", x, y, z);
    printf("windows = (%d, %d, %d)\n", x_windows, y_windows, z_windows);

    /*
    // These are the only 4 texcoords we need.
    add_texcoord( 0.0, 0.0 ); // Top left
    add_texcoord( 0.0, 1.0 ); // Bottom left
    add_texcoord( 1.0, 1.0 ); // Bottom Right
    add_texcoord( 1.0, 0.0 ); // Top right
    */

    add_texcoord( 0.0, 0.0 ); // Top left
    add_texcoord( 0.0, y_windows ); // Bottom left
    add_texcoord( x_windows, y_windows ); // Bottom Right
    add_texcoord( x_windows, 0.0 ); // Top right

    add_texcoord( z_windows, y_windows );
    add_texcoord( z_windows, 0.0 );


    // FIXME: Does setting normals work in a mesh properly? 
    add_normal( 0.0, 0.0, 1.0 ); // front
    add_normal( 1.0, 0.0, 0.0 ); // right
    add_normal( 0.0, 0.0, -1.0 ); // back 
    add_normal( -1.0, 0.0, 0.0 ); // left
    add_normal( 0.0, 1.0, 0.0 ); // up

    /*
   // Front 4 vertices.
    add_vertex( -x/2, y, z/2 );  // 0
    add_vertex( -x/2, 0, z/2 );  // 1
    add_vertex( x/2, 0, z/2 );   // 2
    add_vertex( x/2, y, z/2 );   // 3

    // Back 4 vertices.
    add_vertex( -x/2, y, -z/2 ); // 4
    add_vertex( -x/2, 0, -z/2 ); // 5
    add_vertex( x/2, 0, -z/2 );  // 6
    add_vertex( x/2, y, -z/2 );  // 7
    */

    if( y < 2000 )
	floors = 1 + rand()%2;
    else if( y < 5000 )
	floors = 1 + rand()%3;
    else
	floors = 1 + rand()%6;
    printf("Floors = %d\n", floors);

    float step[4];

    step[0] = z/2;
    step[1] = x/2;
    step[2] = -z/2;
    step[3] = -x/2;

    float y1 = 0.0;

    bool nostep[4] = { false, false, false, false };

    for( int i=0 ; i<4 ; i++ ) {
	if( rand()%5 == 0 )
	    nostep[i] = true;
    }

    level_t level;

    for( int i=0 ; i<floors*2 ; i++ ) {

	add_vertex( step[3], y1, step[0]);
	add_vertex( step[1], y1, step[0]);
	add_vertex( step[1], y1, step[2]);
	add_vertex( step[3], y1, step[2]);

	level.x_windows = (step[1] - step[3])/ IMG_SIZE;
	level.y_windows = (y/floors) / IMG_SIZE;
	level.z_windows = (step[0] - step[2])/ IMG_SIZE;
	windows.push_back(level);

	if( i%2 ) {
	    if( rand()%2 ) {
		for( int j=0 ; j<4 ; j++ ) {
		    if( !nostep[j] && fabs( step[j] ) > 64 )
			step[j] -= step[j] / (4 + drand48() * 5);
		}
	    }
	} else
	    y1 += y/floors;


    }


    /*
    float x1, x2;
    float z1, z2;


    x1 = -x/2.0;
    x2 =  x/2.0;
    z1 =  z/2.0;
    z2 = -z/2.0;

    add_vertex( x1, y1, z1);
    add_vertex( x2, y1, z1);
    add_vertex( x2, y1, z2);
    add_vertex( x1, y1, z2);

    y1 += y;

    add_vertex( x1, y1, z1);
    add_vertex( x2, y1, z1);
    add_vertex( x2, y1, z2);
    add_vertex( x1, y1, z2);

    //float side[4] = { 0, 0, 0, 0 };

    x1 /= 2.0;
    x2 /= 2.0;
    z1 /= 2.0;
    z2 /= 2.0;

    add_vertex( x1, y1, z1);
    add_vertex( x2, y1, z1);
    add_vertex( x2, y1, z2);
    add_vertex( x1, y1, z2);

    y1 += y;

    add_vertex( x1, y1, z1);
    add_vertex( x2, y1, z1);
    add_vertex( x2, y1, z2);
    add_vertex( x1, y1, z2);

    */

    /*

    Face a,b; // a+b one side
    // The texcoords remain constant
    a.texcoord_idx[0] = 0;
    a.texcoord_idx[1] = 3;
    a.texcoord_idx[2] = 2;
    b.texcoord_idx[0] = 2;
    b.texcoord_idx[1] = 1;
    b.texcoord_idx[2] = 0;

    // FRONT
    a.normal_idx[0] = 0;
    a.normal_idx[1] = 0;
    a.normal_idx[2] = 0;

    a.vertex_idx[0] = 0;
    a.vertex_idx[1] = 3;
    a.vertex_idx[2] = 2;
    add_face(a);

    b.normal_idx[0] = 0;
    b.normal_idx[1] = 0;
    b.normal_idx[2] = 0;

    b.vertex_idx[0] = 2;
    b.vertex_idx[1] = 1;
    b.vertex_idx[2] = 0;
    add_face(b);

    // BACK
    a.normal_idx[0] = 1;
    a.normal_idx[1] = 1;
    a.normal_idx[2] = 1;

    a.vertex_idx[0] = 7;
    a.vertex_idx[1] = 4;
    a.vertex_idx[2] = 5;
    add_face(a);

    b.normal_idx[0] = 1;
    b.normal_idx[1] = 1;
    b.normal_idx[2] = 1;

    b.vertex_idx[0] = 5;
    b.vertex_idx[1] = 6;
    b.vertex_idx[2] = 7;
    add_face(b);

    a.texcoord_idx[0] = 0;
    a.texcoord_idx[1] = 5;
    a.texcoord_idx[2] = 4;
    b.texcoord_idx[0] = 4;
    b.texcoord_idx[1] = 1;
    b.texcoord_idx[2] = 0;

    // LEFT
    a.normal_idx[0] = 2;
    a.normal_idx[1] = 2;
    a.normal_idx[2] = 2;

    a.vertex_idx[0] = 4;
    a.vertex_idx[1] = 0;
    a.vertex_idx[2] = 1;
    add_face(a);

    b.normal_idx[0] = 2;
    b.normal_idx[1] = 2;
    b.normal_idx[2] = 2;

    b.vertex_idx[0] = 1;
    b.vertex_idx[1] = 5;
    b.vertex_idx[2] = 4;
    add_face(b);

    // RIGHT
    a.normal_idx[0] = 3;
    a.normal_idx[1] = 3;
    a.normal_idx[2] = 3;

    a.vertex_idx[0] = 3;
    a.vertex_idx[1] = 7;
    a.vertex_idx[2] = 6;
    add_face(a);

    b.normal_idx[0] = 3;
    b.normal_idx[1] = 3;
    b.normal_idx[2] = 3;

    b.vertex_idx[0] = 6;
    b.vertex_idx[1] = 2;
    b.vertex_idx[2] = 3;
    add_face(b);

    // TOP
    a.texcoord_idx[0] = 0;
    a.texcoord_idx[1] = 0;
    a.texcoord_idx[2] = 0;
    b.texcoord_idx[0] = 0;
    b.texcoord_idx[1] = 0;
    b.texcoord_idx[2] = 0;

    a.normal_idx[0] = 4;
    a.normal_idx[1] = 4;
    a.normal_idx[2] = 4;

    a.vertex_idx[0] = 4;
    a.vertex_idx[1] = 7;
    a.vertex_idx[2] = 3;
    add_face(a);

    b.normal_idx[0] = 4;
    b.normal_idx[1] = 4;
    b.normal_idx[2] = 4;

    b.vertex_idx[0] = 3;
    b.vertex_idx[1] = 0;
    b.vertex_idx[2] = 4;
    add_face(b);
    */

}

void Skyscraper::draw(void)
{

    if( texture_id ) {
	glEnable(GL_TEXTURE_2D);
	glBindTexture(GL_TEXTURE_2D, texture_id);
    } else
	glDisable(GL_TEXTURE_2D);


    if( list )
	glCallList(list);
    else {

	vector<level_t>::iterator wdw;
	group_list_t::iterator grp;
	//face_list_t::iterator face;

	// These point to the (x,y(,z)) for each vertex
	GLfloat *nml, *tc, *vtx;

	cout << "DRAWING SKYSCRAPER\n";

	unsigned int vert, idx;

	int g = 0;
	for( grp=groups.begin() ; grp != groups.end() ; grp++ ) {

	    for( int side=0 ; side<4 ; side++ ) {
		glBegin(GL_QUAD_STRIP);

		
//			vert = side;
//		nml = normalv( vert );
//		glNormal3fv( nml );

		/*
		  tc = texcoordv( face->texcoord_idx[i] );
		  glTexCoord2fv(tc);
		*/

		wdw = windows.begin();

		GLfloat wins;
		GLfloat wint;
		GLfloat pos = 0.0;
		int foo = 1;
		
		for( int j=0 ; j<floors*2 ; j++ ) {



		    if( side%2 )
			wins = wdw->z_windows;
		    else
			wins = wdw->x_windows;
		    wint = wdw->y_windows;



		    glTexCoord2f( wins , pos );

		    vert = 4*j + side + 1;

		    if( side && side%3 == 0 )
			vert -= 4;

		    vtx = vertexv(vert);
#ifdef DO_FOG
		    setFogCoord(vtx[1]);
#endif
		    glVertex3fv( vtx );

		    //	    /*
		    if( j%2 ) {
			idx = side;
		    } else {
			idx = 4; //up.
		    }

		    glTexCoord2f( 0.0, pos );

		    glNormal3fv( normalv(idx) );
		    //*/

		    vert = 4*j + side;

		    vtx = vertexv(vert);
#ifdef DO_FOG
		    setFogCoord(vtx[1]);
#endif
		    glVertex3fv( vtx );

		    if( ++foo > 1 ) {
			foo = 0;
			if( pos == 0.0 )
			    pos = wint;
			else
			    pos = 0.0;
		    }




		    wdw++;
		}

		if( !side ) { // draw roof across to opposite side.

		    glTexCoord2f( wins, pos );

		    //glTexCoord2f( wins, wint );

		    idx = 4;
		    glNormal3fv( normalv(idx) ); // up

		    vert = 4 * (floors*2 - 1) + 2;
		    vtx = vertexv(vert);
#ifdef DO_FOG
		    setFogCoord(vtx[1]);
#endif
		    glVertex3fv( vtx );
		    
		    //glTexCoord2f( 0.0, wint );
		    glTexCoord2f( 0.0, pos );
		    vert = 4 * (floors*2 - 1) + 3;
		    vtx = vertexv(vert);
#ifdef DO_FOG
		    setFogCoord(vtx[1]);
#endif
		    glVertex3fv( vtx );
		}


		glEnd();
	    
	    }


	}
	
    }

}

