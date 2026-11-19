// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Apr 10 14:51:55 2005
// Last modified: Sun Apr 10 14:51:55 2005

// Based on sound code from Tumiki Fighters by Kenta Cho
// http://www.asahi-net.or.jp/~cs8k-cyu/windows/tf_e.html

#ifndef SOUND
#define SOUND

#include <string>

/**
 * Abstract sound base class.
 * @see SoundManager
 * Based on sound code from Tumiki Fighters by Kenta Cho
 * http://www.asahi-net.or.jp/~cs8k-cyu/windows/tf_e.html
 */
class Sound {
public:
    Sound() { };
    virtual ~Sound() { };
    virtual void load(const std::string& name) = 0;
    virtual void load(const std::string& name, int ch) = 0;
    virtual void play() = 0;
    virtual void fade() = 0;
    virtual void halt() = 0;
    virtual bool done() = 0;
private:

};

#endif // SOUND
