// (C) David Lawrence released under the GPL (see license.txt)
// Started:              2004
// Last modified: 03 May 2004
//
// -[03May04] - dlawrence - Patchgrid now uses a quadtree
// -[28Jun04] - dlawrence - Added progress bar.

#include "graphics/2d/loadbar.h"
#include "graphics/3d/city/city_generator.h"
#include "graphics/3d/city/patchgrid.h"
#include "graphics/3d/quadtree.h"
#include "graphics/3d/subdividedquad.h"
#include "graphics/display.h"
#include "util/util.h"
#include <algorithm>
#include <iostream>

using namespace std;

PatchGrid::PatchGrid(const vector3& dimensions, int blocksPerChild):
DrawableAABB(dimensions),
center_x(0), center_z(0)
{
	child_length = dimensions.x / patches;
	blocksize = child_length / blocksPerChild;

	// Ground
	groundtex = Texture_Factory("data/images/city/city_block_base.png");
	{
		float side_length = dimensions.x;
		SubdividedQuad* sdquad = new SubdividedQuad(side_length, side_length);
		sdquad->setSubdivisions(16); // do more when lower?
		sdquad->setTextureRepeats( patches * blocksPerChild );
		float offset = (STREET_WIDTH_RATIO - SIDEWALK_WIDTH_RATIO)/2;
		sdquad->setTextureOffsets( -offset, offset );
		ground = sdquad;
	}

	// Load and display progress bar
	LoadBar seattle;
	float inv_total = 1.0f / (patches * patches);
	unsigned int done = 0;

	Display& d = Display::Instance();
	for( unsigned int row=0 ; row<patches ; row++ ) {
		for( unsigned int col=0 ; col<patches ; col++ ) {
			child[row][col] = City_Generator(child_length, 1024, blocksize);
			seattle.setState( ++done * inv_total );
			d.draw_context_2d( &seattle );
			d.swap_buffers();
		}
	}

	// qtree is a quadtree of the patchgrid child array. What an array element
	// points to gets changed in setPosition() when patchgrid moves over the
	// world but the nodes remain relative to each other.
	// Basically: we don't need to update the quadtree.
	qtree = create_patch_tree(0, 0, patches);

}


PatchGrid::~PatchGrid(void)
{
	for( unsigned int row = 0 ; row < patches ; row++ ) {
		for( unsigned int col = 0 ; col < patches ; col++ ) {
			delete child[row][col];
		}
	}

	delete groundtex;
	delete ground;
	delete qtree;
}


void PatchGrid::representation(drawdetails_t& drawdetails)
{
	//    cout << "PatchGrid->representation\n";

	glDisable(GL_DEPTH_TEST);

	groundtex->activate();
	ground->draw(drawdetails);


	glEnable(GL_DEPTH_TEST);

	/*
	drawdetails.lod = 1.0f - drawdetails.camera_height/MAXHEIGHT;
	if( drawdetails.lod < 0.0f )
	drawdetails.lod = 0.0f;
	*/
	//cout << "lod = " << drawdetails.lod << endl;

	// draw the patches using the quadtree for occlusion culling accel. 
	qtree->draw(drawdetails);
}


// FIXME: This was a cut&paste job... could be neater.
void PatchGrid::setPosition(const vector3& pos)
{
	const unsigned int END = patches-1;
	unsigned int row, col;

	int gridx = (int)((pos.x)/child_length);
	int gridz = (int)((pos.z)/child_length);

	if( gridx != center_x || gridz != center_z ) {
		int x_chg = gridx - center_x;
		int z_chg = gridz - center_z;

		// Shift the array (deleting what falls off the end)
		if( x_chg > 0 ) {
			center_x++;
			for( row = 0 ; row < patches ; row++ ) {
				delete child[row][0];
				for( col = 0 ; col < patches-1 ; col++ ) {
					child[row][col] = child[row][col+1];
				}
				child[row][END] = City_Generator(child_length, 1024, blocksize);
			}
		} else if( x_chg < 0 ) {
			center_x--;
			for( row = 0 ; row < patches ; row++ ) {
				delete child[row][END];
				for( col = END ; col > 0 ; col-- ) {
					child[row][col] = child[row][col-1];
				}
				child[row][0] = City_Generator(child_length, 1024, blocksize);
			}
		}

		if( z_chg > 0 ) {
			center_z++;
			for( col = 0 ; col < patches ; col++ ) {
				delete child[END][col];
				for( row = END ; row > 0 ; row-- ) {
					child[row][col] = child[row-1][col];
				}
				child[0][col] = City_Generator(child_length, 1024, blocksize);
			}

		} else if( z_chg < 0 ) {
			center_z--;
			for( col = 0 ; col < patches ; col++ ) {
				delete child[0][col];
				for( row = 0 ; row < patches-1 ; row++ ) {
					child[row][col] = child[row+1][col];
				}
				child[END][col] = City_Generator(child_length, 1024, blocksize);
			}
		}

		Drawable::setPosition( center_x * child_length,
			0.0f,
			center_z * child_length);

	}

}


void PatchGrid::draw_patch(drawdetails_t& drawdetails,
						   const int col,
						   const int row)
{
	//    cout << "draw_patch()\n";
	child[row][col]->draw(drawdetails);
}


GLfloat PatchGrid::getPatchHeight( const int col, const int row )
{
	return child[row][col]->getHeight();
}


Drawable* PatchGrid::create_patch_tree(int x, int y, int n)
{
	Drawable *newchild;

	if (n > 1) {
		float w = n * child_length;
		newchild = new Quadtree(vector3((float)w, (float)y, (float)w));
		n /= 2;
		newchild->add( create_patch_tree(   x,   y, n ) );
		newchild->add( create_patch_tree( x+n,   y, n ) );
		newchild->add( create_patch_tree(   x, y+n, n ) );
		newchild->add( create_patch_tree( x+n, y+n, n ) );
	} else { // leaf node
		newchild = new Patch(this, x, y);
	}

	return newchild;

}



/////////////////////////// PATCH


Patch::Patch(PatchGrid* p, int c, int r): Drawable()
{
	pgrid = p;
	col = c;
	row = r;
	// FIXME: This is wrong!
	setHeight( pgrid->getPatchHeight(col, row) );
}

void Patch::representation(drawdetails_t& drawdetails)
{

	pgrid->draw_patch(drawdetails, col, row);

}

#define DO_LOD 0

/////// make a new type that works this out for patchgrid qtree as those
// are always relative to distance / direction from viewer
#if DO_LOD

const float MAX_HEIGHT_FOR_SIDE_CULLING = 4000.0f;
const float FAR_SIDE_HIDE_DIST = 300.0f;
const float NEAR_SIDE_ONLY_DIST = 1500.0f;

const int COLOR_SIDES_CULLED = 0;

float aabb[6];

// FIXME: This is a temporary hack (that is inaccurate and slow) to
//        provide elementary level of detail etc.
//        REPLACE THIS with LOD selection based on effected
//        screen area  from occlusion horizon algorithm when done.
if( drawdetails.camera_height < MAX_HEIGHT_FOR_SIDE_CULLING ) {
	GLfloat cam_x = Camera::Instance().getPosition().x;
	GLfloat cam_z = Camera::Instance().getPosition().z;

	// FIXME: The cam height adjustment isn't really right....
	GLfloat far_side_hide_dist =  FAR_SIDE_HIDE_DIST;
	far_side_hide_dist +=  1.5 * drawdetails.camera_height;
	GLfloat near_side_only_dist = NEAR_SIDE_ONLY_DIST;
	near_side_only_dist += 4.0f * drawdetails.camera_height;

	GLfloat dist;

	// Work out which sides to mask out...
	// this is complicated & messy but it improved worst case FPS
	// (looking horizontally at ground level) on my machine by 20%
	int ns_mask = ~(NORTH_BIT | SOUTH_BIT);
	int ew_mask = ~(EAST_BIT | WEST_BIT);
	if( drawdetails.flags & NORTH_BIT ) {
		dist = aabb[4] - cam_z;
		if( dist > far_side_hide_dist ) {
			drawdetails.flags &= ~NORTH_BIT; // Turn off
			if( dist > near_side_only_dist )
				drawdetails.flags &= ew_mask;
		}
	}

	if( drawdetails.flags & EAST_BIT ) {
		dist = cam_x - aabb[1];
		if( dist > far_side_hide_dist ) {
			drawdetails.flags &= ~EAST_BIT; // Turn off
			if( dist > near_side_only_dist )
				drawdetails.flags &= ns_mask;
		}
	}

	if( drawdetails.flags & SOUTH_BIT ) {
		dist = cam_z - aabb[5];
		if( dist > far_side_hide_dist ) {
			drawdetails.flags &= ~SOUTH_BIT; // Turn off
			if( dist > near_side_only_dist )
				drawdetails.flags &= ew_mask;
		}
	}

	if( drawdetails.flags & WEST_BIT ) {
		dist = aabb[0] - cam_x;
		if( dist > far_side_hide_dist ) {
			drawdetails.flags &= ~WEST_BIT; // Turn off
			if( dist > near_side_only_dist )
				drawdetails.flags &= ns_mask;
		}
	}


	int sides = 0;
	for( int s=0 ; s<4 ; s++ ) {
		if( drawdetails.flags & 1<<s )
			sides++;
	}

	switch( sides ) {
		case 1:
		case 2:
			drawdetails.lod *= 0.85f;
			break;
		case 3:
			drawdetails.lod *= 0.95f;
			break;
	}

	if( COLOR_SIDES_CULLED ) {
		switch( sides ) {
			case 0: glColor3f( 1.0f, 0.0f, 0.0f); break;
			case 1: glColor3f( 1.0f, 1.0f, 0.0f ); break;
			case 2: glColor3f( 0.0f, 0.0f, 1.0f ); break;
			case 3: glColor3f( 0.0f, 1.0f, 0.0f ); break;
			default: glColor3f( 1.0f, 1.0f, 1.0f ); break;
		}
	}

}

}
#endif


