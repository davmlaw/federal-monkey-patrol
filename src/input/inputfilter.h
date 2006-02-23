// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sat Mar 12 23:57:09 2005
// Last modified: Sat Mar 12 23:57:09 2005

#ifndef INPUTFILTER
#define INPUTFILTER

#include "input/input.h"
#include "util/mtxlib.h"

/**
 * Abstract base class for filters that read input
 * @see Input
 * @see Controller
 */
class InputFilter {
public:
	InputFilter(): request_tuner(false), request_quit(false) { };
	virtual ~InputFilter() { };
	bool tuner(void) { return request_tuner; };
	bool quit(void)  { return request_quit; };
	void read(Input& input) {
		request_tuner = input.buttonToggled( Input::TUNER );
		request_quit  = input.buttonPressed( Input::QUIT );
		_read(input);
	};
protected:
	virtual void _read(Input& input) = 0;
private:
	bool request_tuner;
	bool request_quit;
};

#endif // INPUTFILTER
