// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Mon May 16 16:18:23 2005
// Last modified: Mon May 16 16:18:23 2005

#include "testing.h"
#include "game/mission/world/entities/projectile.h"
#include "game/mission/gamestatistics.h"
#include "game/gamecomponent.h"
#include "graphics/3d/model.h"
#include "graphics/camera/defaultcamera.h"
#include "util/string_util.h"
#include "util/MersenneTwister.h"
#include "util/mtxlib.h"
#include "util/clock.h"
#include "graphics/3d/city/skyscraper.h"
#include "graphics/3d/crosstree.h"
#include "graphics/3d/lsysrenderer.h"

#include "graphics/3d/collision/frustum.h"
#include "graphics/3d/collision/sphere.h"
#include "graphics/3d/collision/aabb.h"
#include "util/lsystem.h"

using namespace std;

extern GameStatistics gamestats;

void test_graphics_context(Drawable* fg)
{
	InputManager* inputmanager = new InputManager();
	Input*               input = new Input();
	Display& d = Display::Instance();
	Camera* camera = new DefaultCamera();

	matrix44 M = IdentityMatrix44();
	vector3 pos(0.0f, 0.0f, -500.0f);

	cout << "---------- BEGIN TESTING LOOP ----------\n";
	Timer timer;

	float r = 0.0f;

	while( input->buttonPressed(Input::QUIT) == false ) {
		r += 0.005f;
		fg->rotate(0.0f, 0.0f, r);

		inputmanager->update(*input);
		d.clear( GL_DEPTH_BUFFER_BIT | GL_COLOR_BUFFER_BIT );
		matrix44 rrm = RotateRadMatrix44('y', r/5.0f);
		camera->setPosTarg( pos, vector3(0.0f, 0.0f, 0.0f) );
		//camera->setPosition( vector3(200.0f, 0.0f, 0.0f) * rrm );
		d.draw_context_3d(camera, NULL, *fg);
		d.swap_buffers();
	}
}

void skyscraper_test(void)
{
	DrawableContainer fg;

	MTRand mt(0xDEADBEEF);

	float min_height = 900.0f;
	float width = 100.0f;
	float space = width * 1.5f;
	float dist = 1000.0f;

	const int NUM_SKYSCRAPERS = 10;
	for( int i=0 ; i<NUM_SKYSCRAPERS ; ++i ) {
		float height = min_height + 400.0f * (float)mt.rand();
		Drawable* d = new Skyscraper(mt, width, height);
		d->setPosition(-space * NUM_SKYSCRAPERS/2.0f + i * space,
			-height/2,
			dist);
		fg.add( d );
	}

	test_graphics_context(&fg);
}


void draw_lsys(void)
{
	{
		LSystem lsys("F");
		lsys.addRule("F->|[-F][+F]");
		lsys.iterate(10);
		LSysRenderer* d = new LSysRenderer(lsys);
		d->setAngle(20.0f);
		d->setDistance(200.0f);
		d->setPosition( vector3(0.0f, -200.0f, 0.0f) );

		DrawableContainer fg;
		//fg.add( new CrossTree(MTRand(), 100, 200) );
		fg.add( d );
		test_graphics_context(&fg);
	}

	// serpinski carpet
	{
		LSystem lsys("F-F-F-F");
		lsys.addRule("F->F[F]-F+F[--F]+F-F");
		lsys.iterate(5);
		LSysRenderer* renderer = new LSysRenderer(lsys);
		renderer->setAngle(90.0f);
		renderer->setDistance(2.0f);
		renderer->setPosition( vector3(0.0f, -200.0f, 0.0f) );

		DrawableContainer foreground;
		foreground.add( renderer );
		test_graphics_context(&foreground);
	}


}


/*
void bvisitor_test(void)
{
float radius = 10.0f;
vector3 pos(0.0f, 0.0f, 0.0f);
vector3 offset(0.0f, radius * 1.5, 0.0f );

Sphere* one   = new Sphere(radius, pos);
Sphere* two   = new Sphere(radius, pos + offset);
Sphere* three = new Sphere(radius, pos + 2 * offset);

if( one->intersects(two) ) {
cout << "1 intersects 2!\n";
}

if( one->intersects(three) ) {
cout << "1 intersects 3!\n";
}
}
*/


void split_test(void)
{
	string str = "comma,separated,list,of,crap";

	strings_t words = split(str, ",");
	for( strings_t::iterator i = words.begin() ; i != words.end() ; ++i ) {
		cout << "word = " << *i << endl;
	}

	cout << "---------\n";

	words = split("foo");
	for( strings_t::iterator i = words.begin() ; i != words.end() ; ++i ) {
		cout << "word = " << *i << endl;
	}

	cout << "---------\n";

	words = split("damn dirty ape");
	for( strings_t::iterator i = words.begin() ; i != words.end() ; ++i ) {
		cout << "word = " << *i << endl;
	}

	cout << "---------\n";

	words = split("");
	for( strings_t::iterator i = words.begin() ; i != words.end() ; ++i ) {
		cout << "word = " << *i << endl;
	}

}


void lsystem_test(void)
{
	LSystem lsys("B");
	lsys.addRule("B->F[-B]+B");
	lsys.addRule("F->FF");
	lsys.iterate(3);
	cout << "Result = " << lsys.getResult() << endl;

	LSystem test2("A");
	test2.addRule("A->AB");
	test2.addRule("B->A");
	test2.iterate();
	cout << "Result = " << test2.getResult() << endl;

	LSystem test3("F");
	test3.addRule("F->|[+F]|[-F]+F");
	test3.iterate(4);
	cout << "Result = " << test3.getResult() << endl;

	LSystem test4("F");
	test4.addRule("F->|{$x,$y}[+F]|[-F]+F");
	test4.iterate(4);
	cout << "Result = " << test4.getResult() << endl;
}

void before_test(void)
{
	//lsystem_test();
}


void testing_area(void)
{
//	lsystem_test();
}


void graphics_test(void)
{
	//skyscraper_test();
	draw_lsys();
}
