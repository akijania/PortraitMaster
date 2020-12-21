const Photo = require('../models/photo.model');
const Voter = require('../models/voter.model');
const Joi = require('joi');

/****** SUBMIT PHOTO ********/

exports.add = async (req, res) => {
  const schema = Joi.object({
    title: Joi.string().alphanum().min(3).max(25).required(),

    author: Joi.string().alphanum().min(3).max(50).required(),

    email: Joi.string().email({
      minDomainSegments: 2,
      tlds: { allow: ['com', 'net', 'pl'] },
    }),
  });

  try {
    const { title, author, email } = req.fields;
    const file = req.files.file;
    const value = await schema.validateAsync({
      title: title,
      author: author,
      email: email,
    });

    if (title && author && email && file) {
      // if fields are not empty...

      const fileName = file.path.split('/').slice(-1)[0]; // cut only filename from full path, e.g. C:/test/abc.jpg -> abc.jpg
      const fileExt = fileName.split('.').slice(-1)[0];
      if (fileExt == 'jpg' || fileExt == 'png' || fileExt == 'gif') {
        const newPhoto = new Photo({
          title,
          author,
          email,
          src: fileName,
          votes: 0,
        });
        await newPhoto.save(); // ...save new photo in DB
        res.json(newPhoto);
      } else {
        throw new Error('Wrong input!');
      }
    } else {
      throw new Error('Wrong input!');
    }
  } catch (err) {
    res.status(500).json(err);
  }
};

/****** LOAD ALL PHOTOS ********/

exports.loadAll = async (req, res) => {
  try {
    res.json(await Photo.find());
  } catch (err) {
    res.status(500).json(err);
  }
};

/****** VOTE FOR PHOTO ********/

exports.vote = async (req, res) => {
  try {
    const photoToUpdate = await Photo.findOne({ _id: req.params.id });
    if (!photoToUpdate) res.status(404).json({ message: 'Not found' });
    else {
      const ip = req.clientIp;
      const voteToUpdate = await Voter.findOne({ user: ip });
      if (!voteToUpdate) {
        const newVoter = new Voter({
          user: ip,
          votes: [req.params.id],
        });
        await newVoter.save();
        photoToUpdate.votes++;
        photoToUpdate.save();
        res.send({ message: 'OK' });
      } else {
        if (voteToUpdate.votes.includes(req.params.id))
          res
            .status(500)
            .json({ message: 'You can not vote twice for the same photo' });
        else {
          voteToUpdate.votes.push(req.params.id);
          voteToUpdate.save();
          photoToUpdate.votes++;
          photoToUpdate.save();
        }
      }
    }
  } catch (err) {
    res.status(500).json(err);
  }
};
