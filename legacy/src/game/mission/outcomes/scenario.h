// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Tue Jul  5 00:15:39 2005
// Last modified: Tue Jul  5 00:15:39 2005

#ifndef SCENARIO_H
#define SCENARIO_H

#include "game/mission/outcomes/condition.h"
#include "game/mission/outcomes/result.h"
#include "game/mission/mission.h"
#include "util/xmlhelper.h"
#include <list>

/**
 * Contains a result which is run if conditions are true
 * @see Condition
 * @see Result
 */
class Scenario {
public:
    Scenario(xmlNodePtr node);
    virtual ~Scenario();
    void run(Mission* mission);
private:
    Result* buildResult(xmlNodePtr result);
    condition_space::Condition* test;
    Result* result;

    // Explicitly disable compiler generated copy functions
    Scenario(const Scenario& rhs);
    Scenario& operator=(const Scenario& rhs);
};


typedef std::list<Scenario*> scenario_list_t;


#endif // SCENARIO_H
