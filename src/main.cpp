// (C) David Lawrence released under the GPL (see license.txt)
// Started:              2004
// Last modified: 27 Dec 2004

#include "game/gamemanager.h"
#include "game/mission/gamestatistics.h"
#include "graphics/display.h"
#include "graphics/timer.h"
#include "input/inputmanager.h"
#include "kong.h"
#include "sound/soundmanager.h"
#include "util/settings.h"
#include "util/averager.h"
#include "util/string_util.h"
#include "testing.h"

#include <algorithm>
#include <iostream>
#include <time.h>

using namespace std;

// global per game...
Settings        settings;
GameStatistics gamestats;

int main(int argc, char *argv[])
{
	before_test();

    GameManager*          game = NULL;
    InputManager* inputmanager = NULL;
    Input*               input = NULL;

    try {
	Display::Instance();
	//SoundManager::Instance();
	graphics_test();
 	testing_area();

	string game_datafile;
	if( argc == 2 ) {
	    game_datafile = argv[1];
	} else {
	    game_datafile = settings.gets("main", "default_game");
	}

	game         = new GameManager(game_datafile);
	inputmanager = new InputManager();
	input        = new Input();
	Timer timer;

	cout << "---------- BEGIN MAIN LOOP ----------\n";

	while( game->getStatus() != QUIT ) {
	    inputmanager->update(*input);
	    game->play( timer.tick(), input );
	}
    } catch( string s ) {
	cout << "Uncaught Exception: " << s << endl;
    } catch( ... ) {
	cout << "Uncaught Exception.\n";
    }

    delete game;
    delete inputmanager;
    delete input;
    return 0;
}


