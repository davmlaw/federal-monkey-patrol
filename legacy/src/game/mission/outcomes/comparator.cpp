// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Wed Jul 13 23:06:40 2005
// Last modified: Wed Jul 13 23:06:40 2005

#include "comparator.h"
#include "util/util.h"

using namespace std;
using namespace condition_space;

Comparator::Comparator(GameStatistics* g, stats_t s,
		       const std::string& o, unsigned int v):
    gamestats(g), stat(s), op(o), val(v)
{

}


bool Comparator::isTrue(void)
{
    return eval( gamestats->get(stat), op, val );
}
