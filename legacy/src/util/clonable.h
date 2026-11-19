// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Wed Oct 26 15:31:00 2005
// Spelt according to English, not according to Sun.

#ifndef CLONABLE_H
#define CLONABLE_H

/**
 * Abstract base for objects which can make copies of themselves.
 */
class Clonable {
public:
    Clonable() { };
    virtual ~Clonable() { };
    virtual Clonable* clone() const = 0;
};

#endif // CLONABLE_H
