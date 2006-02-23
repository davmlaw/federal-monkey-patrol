// (C) David Lawrence released under the GPL (see license.txt)
// Started:       21 Aug 2004
// Last modified: 21 Aug 2004

#include "game/mission/mission.h"
#include "game/mission/missionbuilder.h"
#include "game/mission/gamestatistics.h"
#include "graphics/2d/chyron.h"
#include "graphics/2d/fogplane.h"
#include "graphics/2d/text2d.h"
#include "graphics/camera/smoothcamera.h"
#include "util/MersenneTwister.h"
#include "util/fps_counter.h"
#include "util/properties.h"
#include <iostream>
#include <sstream>

using namespace std;

extern GameStatistics gamestats;

Mission::Mission(const string& n):
name(n),
world(0),
player(0),
constraints(0),
cameraman(0),
claw(0),
outcomes(0),
fogplane(0),
hud(0),
clawalert(0),
chyron(0),
instructions(0),
countdowntimer(0)
{
	status = PLAYING;
}

Mission::~Mission()
{
	delete world;
	delete player;
	delete constraints;
	delete cameraman;
	delete claw;
	delete outcomes;
	delete fogplane;
	delete hud; // also removes clawalert, chyron, countdowntimer
	delete instructions;
}


void Mission::_load(void)
{
	cout << "Loading " << getName() << "\n";
	MissionBuilder(this, name);

	const float FAR_DIST  = 25000.0f; // FIXME get rid of this
	fogplane = new FogPlane(Display::ORTHO_W, Display::ORTHO_H, FAR_DIST);
	hud = new Container2D(Display::ORTHO_W, Display::ORTHO_H);

	if( claw ) {
		clawalert = new ClawAlert(0.15f, 0.35f);
		hud->add( clawalert, Container2D::RIGHT );
	}
	if( countdowntimer ) {
		hud->add( countdowntimer, Container2D::TOP | Container2D::RIGHT );
	}

	cameraman = new CameraMan( new SmoothCamera(1, 10) );
	cameraman->setFollowAbsoluteHeight( 90.0f );
	cameraman->setFollowHeight( 0.0f );
	cameraman->setFollowDistance( 0.0f );

	world = new World();
	world->addEntity(player->entity);
	gamestats.reset();
}


void Mission::_play(Uint32 msecs, Input* input, float alpha)
{
	update(msecs, input);
	draw(msecs);

	if( outcomes )
		outcomes->update(this);
}


void Mission::update(Uint32 msecs, Input* input)
{
	gamestats.addGameTime( msecs );
	/*
	static MTRand mt;


	if( mt.rand() < 0.002f ) {
	gamestats.inc( MONKEY_DEATHS );
	cout << "another monkey bites the dust!\n";
	} else if( mt.rand() < 0.002 ) {
	gamestats.inc( BLONDE_RESCUES );
	cout << "oh thankyou, handsome pilot!\n";
	}


	if( claw ) {
	claw->update( plane->getPosition(), msecs );
	clawalert->setState( claw->getState() );
	}
	*/

	if( countdowntimer ) {
		countdowntimer->update( gamestats.get( GAME_SECONDS ) );
	}

	if( input ) {
		player->read(*input);
	}
	if (constraints) {
		constraints->restrict( player );
	}
	world->update( msecs );
}


void Mission::draw(Uint32 msecs)
{
	// fog out horizon when horizontal, but still allow to see buildings
	// when looking down.
	//glFogf(GL_FOG_END, 8000 + 0.5 * position.y);
	Display::Instance().draw_context_2d( fogplane );
	cameraman->lookAt( player->entity->drawable );
	world->draw( cameraman->getCamera() );
	draw_2d_overlay(msecs);
}


void Mission::draw_2d_overlay(Uint32 msecs)
{
	Display::Instance().draw_context_2d( hud );

	if( msecs ) {
		fps_counter.update(msecs);

		Container2D stats(Display::ORTHO_W, Display::ORTHO_H);

		float y_pos = Display::ORTHO_H * 0.5f;

		ostringstream avg_ss;
		avg_ss << "avrge fps: " << fps_counter.getFPS();
		const string avg_str = avg_ss.str();

		y_pos -= text_height(avg_str.c_str()) * 0.2f / 2;
		Drawable2D* average = new Text2D(avg_str, 0.2f);
		average->position.y = y_pos;
		stats.add( average, Container2D::LEFT );
		y_pos -= text_height(avg_str.c_str()) * 0.2f;

		ostringstream worst_ss;
		worst_ss << "worst fps: " << fps_counter.getWorstFPS();
		const string worst_str = worst_ss.str();
		Drawable2D* worst = new Text2D(worst_str, 0.2f);
		worst->position.y = y_pos;
		stats.add( worst, Container2D::LEFT );

		Display::Instance().draw_context_2d( &stats );
	}

}











/*
cout << "Axis: "
<< input->getAxis().x
<< input->getAxis().y
<< endl;
*/

/*
if( pos.y > MAXHEIGHT )
pos.y = MAXHEIGHT;
else if( pos.y < MINHEIGHT )
pos.y = MINHEIGHT;
*/

// -1.0 to invert controls (like an airplane)
//vector2 axis = input->getAxis();
//	plane->rotate( -1.0f * axis.y, -axis.x, 0.0f);

/*    
const float MAXSPEED = 1000.0f;
const float MINSPEED =  0.0f;

speed += input->val;
if( speed > MAXSPEED )
speed = MAXSPEED;
else if( speed < MINSPEED )
speed = MINSPEED;
*/






/*

#if 0     // Hack for Sam..
chyron = new Chyron("Common People",
"William Shatner",
"Has Been", 0.3f, 0.1f);
hud->addLeft(chyron);

if( inst_alpha > 0 ) {
float w = Display::ORTHO_W / 5;
float h = Display::ORTHO_H / 5;

Image instructions("data/images/menu/top.png", w, h);
instructions.position.x = Display::ORTHO_W * 0.1;
instructions.position.y = Display::ORTHO_W * 0.1f;
Display::Instance().draw_context_2d( &instructions, inst_alpha );
inst_alpha -= (float)msecs / (10.0 * 1000);
}
#endif


monkeybrain = new AIFilter();
monkeybrain->thinkAbout(world);
monkeybrain->setEnemy(world->getPlayer());

monkey = new Monkey();
monkey->setController( monkeybrain );

if( mode == TOP_DOWN ) {
plane->setController( new TopDownFilter() );
} else {
plane->setController( new ClassicFlyFilter() );
}

player->input( input );


player->input;
{
filter->read( input );

}

entity->update;
{ 
inputFilter( this );
}


filter = new TopDown( );
filter = new Sideways( );

filter->read( input );
filter->control( plane );

*/
