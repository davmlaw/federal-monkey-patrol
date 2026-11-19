// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Wed Mar 16 01:06:01 2005
// Last modified: Wed Mar 16 01:06:01 2005

#include "plane.h"
#include "game/mission/world/entities/projectile.h"
#include "game/mission/gamestatistics.h"
#include "graphics/3d/billboards.h"
#include "graphics/3d/model.h"
#include <iostream>

using namespace std;


Plane::Plane(Drawable* d): Entity(d)
{

}


Plane::~Plane()
{

}

extern GameStatistics gamestats;

void Plane::_update(World& world, Uint32 msecs)
{
    reload_time -= msecs;
    reload_time = clamp<long>(0, reload_time, 1000);
    if( firing && reload_time <= 0) {
	vector3 offset(5.0f, 0.0f, 0.0f);
	string tex = "data/images/billboards/bullet.png";
	string ptype;
	vector3 movement;
	stats_t stat;
	
	if( firing == 1 ) {
	    ptype = "bullet";
	    movement.set(0.0f, 0.0f, -150.0f);
	    stat = BULLETS_FIRED;
	} else { 
	    ptype = "bomb";
	    movement.set(0.0f, -100.0f, 0.0f);
	    stat = BOMBS_DROPPED;
	}
	gamestats.inc( stat );

	ptype = "bomb"; // REMOVE: hack

	vector3 vRotation = drawable->getRotation();	
	matrix44 rot = drawable->getRotMat();
	offset = rot * offset;

	Projectile* bullet = Projectile_Factory(ptype);
	bullet->drawable->setScale( 0.005f );
	bullet->drawable->setPosition( drawable->getPosition() - offset);
	bullet->drawable->setRotation( vRotation );
	bullet->velocity = this->velocity + movement;

	bullet->setLifetime( 1000 );

	world.addEntity( bullet );


	bullet = Projectile_Factory(ptype);
	bullet->drawable->setScale( 0.005f );
	bullet->drawable->setPosition( drawable->getPosition() + offset);
	bullet->drawable->setRotation( vRotation );
	bullet->velocity = this->velocity + movement;
	bullet->setLifetime( 1000 );

	world.addEntity( bullet );

	reload_time = 75;

/*
	d = new Billboard(tex, 5.0f, 5.0f, 180.0f);
	d->setScale( 0.01f );
	d->setPosition( drawable->getPosition() + offset);
	bullet = new Projectile( d );
	bullet->velocity = velocity + vector3( 0.0f, 0.0f, -200.0f );
	bullet->setLifetime( 1000 );

	world.add_entity( bullet );
*/
    }

}



/*

	vector3 offset(5.0f, 0.0f, 0.0f);
	string tex = "data/images/billboards/bullet.png";

	Drawable* d = new Billboard(tex, 5.0f, 5.0f, 180.0f);
	d->setScale( 0.01f );
	d->setPosition( drawable->getPosition() - offset);
	Projectile* bullet = new Projectile( d );
	bullet->velocity = velocity + vector3( 0.0f, 0.0f, -200.0f );
	bullet->setLifetime( 1000 );

	world.add_entity( bullet );


	d = new Billboard(tex, 5.0f, 5.0f, 180.0f);
	d->setScale( 0.01f );
	d->setPosition( drawable->getPosition() + offset);
	bullet = new Projectile( d );
	bullet->velocity = velocity + vector3( 0.0f, 0.0f, -200.0f );
	bullet->setLifetime( 1000 );


	world.add_entity( bullet );

*/
