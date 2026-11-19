// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Fri Jul 15 01:03:08 2005
// Last modified: Fri Jul 15 01:03:08 2005

#include "gamecomponent.h"
#include "util/string_util.h"

using namespace std;

GameStatusMap* GameComponent::gameStatusMap = 0;
char* GameComponent::gameStatusNames[NUM_GAME_STATUSES] = {
    "PLAYING",
    "NEXT",
    "LOST",
    "QUIT"
};

// Static
const char* GameComponent::gameStatusName(game_status_t i)
{
    return i<NUM_GAME_STATUSES? gameStatusNames[i] : "";
}


// Static
const game_status_t GameComponent::gameStatusFromName(const string& name)
{
    if( !gameStatusMap ) {
	gameStatusMap = new GameStatusMap();
	for( int i=0 ; i<NUM_GAME_STATUSES ; ++i ) {
	    (*gameStatusMap)[ gameStatusNames[i] ] = (game_status_t)i;
	}
    }
    return (*gameStatusMap)[ uc(name) ];
}

