// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sat May  7 11:36:17 2005
// Last modified: Sat May  7 11:36:17 2005

#include "parkland.h"
#include "graphics/3d/drawablecontainers.h"
#include "graphics/3d/subdividedquad.h"
#include "graphics/3d/crosstree.h"
#include <iostream>

using namespace std;

static const float TREE_SIZE     = 100.0f;
static const int   TREE_VARIANCE = 10;
static const float TREE_DENSITY = 0.12f;

Parkland::Parkland(MTRand& mt, float x_length, float z_length)
{
	groundtex = Texture_Factory("data/images/city/grass.jpg");
	ground = new SubdividedQuad(x_length, z_length, 2);

	DrawableContainer* container = new DrawableContainer();

	float hx = x_length / 2;
	float xi = 20.0f * x_length / (TREE_SIZE+TREE_VARIANCE);

	float hz = z_length / 2;
	float zi = 20.0f * z_length / (TREE_SIZE+TREE_VARIANCE);

	for( float x = -hx ; x < hx ; x += xi) {
		for( float z = -hz ; z < hz ; z += zi ) {
			if( mt.rand() < TREE_DENSITY ) {
				float height = TREE_SIZE + (float)(mt.rand() * TREE_VARIANCE);
				Drawable* tree = new CrossTree(mt, height/3, height);
				vector3 pos;
				pos.x = x;
				pos.y = height * 0.5f;
				pos.z = z;
				tree->setPosition( pos );
				container->add( tree );
			}
		}
	}

	forest = container;
}


Parkland::~Parkland()
{
	delete groundtex;
	delete ground;
	delete forest;
}

void Parkland::representation(drawdetails_t& drawdetails)
{
	groundtex->activate();
	ground->draw(drawdetails);
	forest->draw(drawdetails);
}

