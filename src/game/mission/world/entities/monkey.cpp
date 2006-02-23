// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Wed Mar 16 01:05:57 2005
// Last modified: Wed Mar 16 01:05:57 2005

#include "monkey.h"
#include "game/mission/gamestatistics.h"
#include <iostream>

using namespace std;
extern GameStatistics gamestats;

Monkey::Monkey(Drawable* d): Entity(d)
{

}


Monkey::~Monkey()
{
    gamestats.inc(MONKEY_DEATHS);
}


void Monkey::_update(World& world, Uint32 msecs)
{

    cout << "monkey->update()\n";


}
