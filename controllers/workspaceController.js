const Workspace = require('../models/Workspace');

exports.createWorkspace = async (req, res) => {
  try {
    const { name, created_by_user_id, clientInfo } = req.body;

    const workspace = new Workspace({
      name,
      created_by_user_id,
      icp_inputs: {},
      icp_models: {
        generated_versions: [],
        selected_version: 0
      },
      metrics: {},
      collaborators: []
    });

    await workspace.save();
    res.status(201).json({ success: true, workspace });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
