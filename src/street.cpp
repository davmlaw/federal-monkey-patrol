#include <stdio.h>
#include <string.h>
#include <math.h>

#include "kong.h"
#include "street.h"

Street *Street_Factory(GLfloat x_span, GLfloat z_span)
{
    Street *millhouse = NULL;

    millhouse = new Street();

    millhouse->load(x_span, z_span);
    millhouse->setTexture("data/road.bmp");
    millhouse->process();

    return millhouse;

}


void Street::load(GLfloat x, GLfloat z)
{

    int z_repeats = z / 2000;

    add_texcoord( 0.0, 0.0 ); // Top left
    add_texcoord( 1.0, 0.0 ); // Top right
    add_texcoord( 0.0, z_repeats );
    add_texcoord( 1.0, z_repeats );

    add_normal( 0.0, 1.0, 0.0 ); // up

    add_vertex( -x/2, 0, -z/2);
    add_vertex(  x/2, 0, -z/2);
    add_vertex( -x/2, 0,  z/2);
    add_vertex(  x/2, 0,  z/2);

    Face a,b; // a+b one side

    a.texcoord_idx[0] = 0;
    a.texcoord_idx[1] = 1;
    a.texcoord_idx[2] = 3;

    b.texcoord_idx[0] = 0;
    b.texcoord_idx[1] = 3;
    b.texcoord_idx[2] = 2;

    // FRONT
    a.normal_idx[0] = 0;
    a.normal_idx[1] = 0;
    a.normal_idx[2] = 0;

    a.vertex_idx[0] = 0;
    a.vertex_idx[1] = 1;
    a.vertex_idx[2] = 3;
    add_face(a);

    b.normal_idx[0] = 0;
    b.normal_idx[1] = 0;
    b.normal_idx[2] = 0;

    b.vertex_idx[0] = 0;
    b.vertex_idx[1] = 3;
    b.vertex_idx[2] = 2;
    add_face(b);

}

