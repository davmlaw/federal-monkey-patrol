// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Tue Jul  5 00:18:43 2005
// Last modified: Tue Jul  5 00:18:43 2005

#include "result.h"
#include "game/mission/mission.h"
#include "game/gamecomponent.h"
#include <iostream>

using namespace std;


Result::Result(const strings_t& args, bool oonly):
    onceOnly(oonly), done(false)
{

}


Result::~Result()
{

}


void Result::execute(GameComponent* gameComponent)
{
    if( !done ) {
	_execute(gameComponent);
	if ( onceOnly )
	    done = true;
    }
}



ChangeStatusResult::ChangeStatusResult(const strings_t& args, bool onceOnly):
    Result(args, onceOnly)
{
    game_status_t s = QUIT;
    if( args.size() >= 1 ) {
	string value = args[0];
	s = GameComponent::gameStatusFromName( uc(args[0]) );
#if 0
	cout << "value = '" << value << "'"
	     << " status = " << GameComponent::gameStatusName(s) << endl;
	if( args.size() >= 2 ) {
	    cout << "message = " << args[1] << endl;
	}
#endif
    }
    toStatus = s;
}


void ChangeStatusResult::_execute(GameComponent* gameComponent)
{
    cout << "ChangeGameStatus->execute() status = "
	 << GameComponent::gameStatusName(toStatus) << endl;
    gameComponent->setStatus( toStatus );
}
