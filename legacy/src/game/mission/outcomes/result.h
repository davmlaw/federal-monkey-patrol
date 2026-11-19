// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Tue Jul  5 00:18:43 2005
// Last modified: Tue Jul  5 00:18:43 2005

#ifndef RESULT_H
#define RESULT_H

#include "game/gamecomponent.h"
#include "util/string_util.h"
#include <string>
#include <vector>

/**
 * Called by Scenario when condition is true
 * @see Condition
 * @see Scenario
 */
class Result {
public:
    Result(const strings_t& args, bool onceOnly = true);
    virtual ~Result();
    void execute(GameComponent* gameComponent);
private:
    virtual void _execute(GameComponent* gameComponent) = 0;
    bool onceOnly;
    bool done;
    // Explicitly disable compiler generated copy functions
    Result(const Result& rhs);
    Result& operator=(const Result& rhs);
};



class ChangeStatusResult : public Result {
public:
    ChangeStatusResult(const strings_t& args, bool onceOnly = true);
    virtual ~ChangeStatusResult() { };
    virtual void _execute(GameComponent* gameComponent);
private:
    game_status_t toStatus;
    // Explicitly disable compiler generated copy functions
    ChangeStatusResult(const ChangeStatusResult& rhs);
    ChangeStatusResult& operator=(const ChangeStatusResult& rhs);
};



#endif // RESULT_H
