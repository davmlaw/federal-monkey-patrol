// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Mon Apr 11 21:17:43 2005
// Last modified: Mon Apr 11 21:17:43 2005

#include "gamestatistics.h"
#include "util/string_util.h"
#include <string.h>
#include <iostream>

using namespace std;

StatMap* GameStatistics::statMap;
char* GameStatistics::statNames[NUM_STATS] = {
    "*NOSUCHSTAT*",
    "GAME_SECONDS",
    "PLAYER_DEATHS",
    "BULLETS_FIRED",
    "BOMBS_DROPPED",
    "MONKEY_DEATHS",
    "MONKEY_POPULATION",
    "BLONDE_RESCUES",
    "BLONDE_CASUALTIES",
    "BUILDINGS_DESTROYED"
};

// Static
const char* GameStatistics::statName(unsigned int i)
{
    return i<NUM_STATS? statNames[i] : "";
}


// Static
const stats_t GameStatistics::statFromName(const string& name)
{
    if( !statMap ) {
	statMap = new StatMap();
	for( int i=0 ; i<NUM_STATS ; ++i ) {
	    (*statMap)[ statNames[i] ] = (stats_t)i;
	}
    }
    return (*statMap)[ uc(name) ];
}


GameStatistics::GameStatistics()
{
	cout << "GameStatistics()\n";
    reset();
}


GameStatistics::~GameStatistics()
{
    cout << "===== Game Statistics =====\n";
    for( int i=0 ; i<NUM_STATS ; ++i ) {
	cout << statName(i) << " = " << stats[i] << endl;
    }
}

void GameStatistics::addGameTime(Uint32 msecs)
{
    Uint32 inc = gameSecsRemainder + msecs;
    stats[GAME_SECONDS] += inc/1000;
    gameSecsRemainder = inc%1000;
}


void GameStatistics::reset()
{
    //cout << "gamestats.reset()\n";
    for( int i=0 ; i<NUM_STATS ; ++i ) {
	stats[i] = 0;
    }
    gameSecsRemainder = 0;
}



